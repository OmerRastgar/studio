import { Router } from 'express';
import { kratosAuthenticate, KratosAuthRequest } from '../middleware/kratos-auth';
import { generateKongJWT } from '../lib/jwt-kong';
import { hashPassword } from '../lib/jwt';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Issue JWT token for authenticated Kratos session
 * POST /api/auth/token
 * 
 * Requires valid Kratos session cookie
 * Returns short-lived JWT for API authorization via Kong
 */
router.post('/token', kratosAuthenticate, async (req: KratosAuthRequest, res) => {
    try {
        // kratosAuthenticate middleware ensures req.user exists
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'No valid session found'
            });
        }

        const { userId, email, role, name } = req.user;

        // Lazy Sync: Ensure user exists in local DB
        // This handles self-registration flow via Kratos UI
        const localUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!localUser) {
            console.log(`[Lazy Sync] Creating local user record for ${email} (${userId})`);
            // Create default user
            // Password is required by schema, but not used for auth. Use dummy hash.
            const dummyHash = await hashPassword('kratos_managed_user');

            await prisma.user.create({
                data: {
                    id: userId,
                    email: email,
                    name: name || 'Unknown User',
                    role: role as any || 'customer',
                    status: 'Active',
                    password: dummyHash,
                    avatarUrl: `https://picsum.photos/seed/${userId}/100/100`
                }
            }).catch(err => {
                console.error('[Lazy Sync] Failed to create user:', err);
                // Non-fatal? If we fail, user might not show in lists but still gets token.
                // Better to log and proceed.
            });
        } else {
            // Optional: Sync details if they changed in Kratos? 
            // For now, assume Kratos -> Local sync updates happen via Admin/User API or Webhooks.
            // But we can update lastActive here.
            await prisma.user.update({
                where: { id: userId },
                data: { lastActive: new Date() }
            }).catch(console.error);
        }

        // Generate JWT token (1 hour expiry)
        const token = generateKongJWT({
            sub: userId,
            email,
            role,
            name
        });

        return res.json({
            success: true,
            data: {
                token,
                token_type: 'Bearer',
                expires_in: 86400, // 24 hours in seconds
                user: {
                    id: userId,
                    email,
                    role,
                    name
                }
            }
        });

    } catch (error) {
        console.error('[Token Issuance] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to issue token'
        });
    }
});

/**
 * Refresh JWT token
 * POST /api/auth/token/refresh
 * 
 * Requires valid Kratos session cookie
 * Issues new JWT if session still valid
 */
router.post('/token/refresh', kratosAuthenticate, async (req: KratosAuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Session expired'
            });
        }

        const { userId, email, role, name } = req.user;

        const token = generateKongJWT({
            sub: userId,
            email,
            role,
            name
        });

        return res.json({
            success: true,
            data: {
                token,
                token_type: 'Bearer',
                expires_in: 86400
            }
        });

    } catch (error) {
        console.error('[Token Refresh] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

export default router;
