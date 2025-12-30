import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import tokenRoutes from './token';
import { kratosAdmin } from '../lib/kratos';

const router = express.Router();

// POST /api/auth/login - DEPRECATED
router.post('/login', async (req, res) => {
    return res.status(410).json({ error: 'Legacy login is disabled. Please use Kratos authentication.' });
});

// POST /api/auth/register - DEPRECATED
router.post('/register', async (req, res) => {
    return res.status(410).json({ error: 'Legacy registration is disabled. Please use Kratos self-service.' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // 1. Fetch from Kratos (Source of Truth)
        let identity;
        try {
            const { data } = await kratosAdmin.getIdentity({ id: userId });
            identity = data;
        } catch (error) {
            console.error('Failed to fetch identity from Kratos:', error);
            return res.status(404).json({ error: 'User identity not found' });
        }

        const traits = identity.traits as any;
        console.log('[Auth Debug] /me traits:', JSON.stringify(traits));
        const computedName = typeof traits.name === 'string'
            ? traits.name
            : `${traits.name?.first || ''} ${traits.name?.last || ''}`.trim();
        console.log('[Auth Debug] /me computed name:', computedName);

        // 2. Fetch from Local DB (Auxiliary Data)
        // 2. Fetch from Local DB (Auxiliary Data)
        const localUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                avatarUrl: true,
                managerId: true,
                lastActive: true,
                forcePasswordChange: true,
                // Fetch status/role from DB as authority
                status: true,
                role: true
            }
        });

        // 3. JIT Provisioning & Demo Linking
        // If local user is missing, create them (JIT) and link to Demo Project if they are a customer.
        if (!localUser) {
            console.log(`[Auth JIT] Provisioning new user for ${userId} (${traits.email})`);

            // Default to 'customer' if role missing
            const role = traits.role || 'customer';
            const email = traits.email;

            // Create User
            const newUser = await prisma.user.create({
                data: {
                    id: userId,
                    email: email,
                    name: computedName,
                    role: role,
                    status: 'Active',
                    password: 'kratos_managed_user', // Placeholder
                    avatarUrl: `https://ui-avatars.com/api/?name=${computedName.replace(' ', '+')}`,
                    isNewUser: true
                }
            });

            // Demo Project Linking (Only for Customers)
            if (role === 'customer') {
                const DEMO_PROJECT_NAME = 'ISO 27001 Master Demo'; // Must match seed

                // Find Demo Project (by name or specific logic)
                const demoProject = await prisma.project.findFirst({
                    where: { name: DEMO_PROJECT_NAME }
                });

                if (demoProject) {
                    console.log(`[Auth JIT] Linking new customer to Demo Project ${demoProject.id}`);
                    await prisma.projectShare.create({
                        data: {
                            userId: newUser.id,
                            projectId: demoProject.id
                        }
                    });
                } else {
                    console.warn('[Auth JIT] Demo Project not found. Skipping link.');
                }
            }

            // Refresh localUser reference
            // Re-fetch or cast newUser
            // We can just use newUser properties for the response, but to keep the flow below clean:
            // Let's just override the response object construction below or assume localUser is now newUser-like.
            // Actually, the code below checks `localUser?.role`. 
            // We can reload or just manually construct the response. 
        }

        // Re-fetch to be safe and consistent with the types used below
        const finalizedLocalUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                avatarUrl: true,
                managerId: true,
                lastActive: true,
                forcePasswordChange: true,
                status: true,
                role: true,
                isNewUser: true
            }
        });

        // 4. Return Merged Data
        // SECURITY: If local user exists, their role is the authority. 
        // If not (shadow user missing), allow Kratos role UNLESS it is 'admin'.
        let effectiveRole = traits.role || 'customer';
        if (finalizedLocalUser?.role) {
            effectiveRole = finalizedLocalUser.role;
        } else if (effectiveRole === 'admin') {
            // Self-service user claiming admin without a DB record -> Downgrade
            console.warn(`[Auth Security] Downgrading spoofed admin role for ${identity.id} in /me response`);
            effectiveRole = 'customer';
        }

        res.json({
            success: true,
            user: {
                id: identity.id,
                name: typeof traits.name === 'string'
                    ? traits.name
                    : `${traits.name.first} ${traits.name.last}`,
                email: traits.email,
                role: effectiveRole,
                status: finalizedLocalUser?.status || (identity.state === 'active' ? 'Active' : 'Inactive'),
                avatarUrl: finalizedLocalUser?.avatarUrl || `https://picsum.photos/seed/${identity.id}/100/100`,
                lastActive: finalizedLocalUser?.lastActive?.toISOString(),
                forcePasswordChange: finalizedLocalUser?.forcePasswordChange ?? false,
                isNewUser: finalizedLocalUser?.isNewUser ?? true,
                createdAt: identity.created_at
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Token issuance endpoints (for Kong JWT authorization)
router.use(tokenRoutes);

// POST /api/auth/ack-password-change - Acknowledge forced password change
router.post('/ack-password-change', authenticate, async (req: AuthRequest, res: any) => {
    try {
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

        const targetUserId = req.body.userId || currentUser.userId;

        // Only allow self or admin
        if (currentUser.role !== 'admin' && targetUserId !== currentUser.userId) {
            return res.status(403).json({ error: 'Unauthorized to acknowledge for other users' });
        }

        await prisma.user.update({
            where: { id: targetUserId },
            data: { forcePasswordChange: false }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Ack password change error:', error);
        res.status(500).json({ error: 'Failed to acknowledge password change' });
    }
});

export default router;

