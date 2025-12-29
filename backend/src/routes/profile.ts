import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { kratosAdmin } from '../lib/kratos';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/profile - Get current user profile & integrations
router.get('/', async (req, res) => {
    try {
        const currentUser = (req as any).user;

        // Fetch user with relations
        const user = await prisma.user.findUnique({
            where: { id: currentUser.userId },
            include: {
                integrations: true,
                auditor: true, // properties like experience
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                integrations: user.integrations,
                // Auditor specific fields
                experience: user.auditor?.experience,
                certifications: user.auditor?.certifications || [],
            }
        });
    } catch (error) {
        console.error('[Profile] Get error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/profile - Update profile details
router.put('/', async (req, res) => {
    try {
        const currentUser = (req as any).user;
        const { name, bio, experience, certifications } = req.body;

        console.log(`[Profile] Updating user ${currentUser.userId}`, req.body);

        // 1. Update basic User fields
        const updateData: any = {};
        if (bio !== undefined) updateData.bio = bio;
        if (name !== undefined) updateData.name = name;

        // If name changed, we should probably sync to Kratos too, but let's keep it simple for now
        // or copy the logic from users.ts if strict consistency is needed.
        // For "fixing their own profile", local DB update is the primary visibility for the app.

        await prisma.user.update({
            where: { id: currentUser.userId },
            data: updateData
        });

        // 2. If Auditor, update Auditor fields
        if (currentUser.role === 'auditor') {
            // Check if auditor record exists
            const auditor = await prisma.auditor.findUnique({
                where: { userId: currentUser.userId }
            });

            if (auditor) {
                await prisma.auditor.update({
                    where: { userId: currentUser.userId },
                    data: {
                        experience: experience,
                        // certifications is String[]
                        certifications: Array.isArray(certifications) ? certifications : []
                    }
                });
            } else {
                // Should exist for auditor role, but if not create it?
                // Assuming it exists. If not, we might ignore or create.
                console.warn(`[Profile] Auditor record missing for user ${currentUser.userId}`);
            }
        }

        res.json({ success: true, message: 'Profile updated' });

    } catch (error) {
        console.error('[Profile] Update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/profile/integrations - Update an integration
router.put('/integrations', async (req, res) => {
    try {
        const currentUser = (req as any).user;
        const { provider, config } = req.body;

        if (!provider || !config) {
            return res.status(400).json({ error: 'Provider and config required' });
        }

        const validProviders = ['minio', 'kong', 'api', 'google', 'jira', 'slack'];
        if (!validProviders.includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider' });
        }

        // Access Control
        const adminOnly = ['minio', 'kong', 'api'];
        if (adminOnly.includes(provider) && currentUser.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied for this integration' });
        }

        // Upsert Integration
        const integration = await prisma.userIntegration.upsert({
            where: {
                userId_provider: {
                    userId: currentUser.userId,
                    provider: provider
                }
            },
            create: {
                userId: currentUser.userId,
                provider: provider,
                config: config
            },
            update: {
                config: config
            }
        });

        res.json({ success: true, integration });

    } catch (error) {
        console.error('[Profile] Integration update error:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

export default router;
