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
                forcePasswordChange: true
            }
        });

        // 3. Return Merged Data
        res.json({
            success: true,
            user: {
                id: identity.id,
                name: typeof traits.name === 'string'
                    ? traits.name
                    : `${traits.name.first} ${traits.name.last}`,
                email: traits.email,
                role: traits.role,
                status: identity.state === 'active' ? 'Active' : 'Inactive',
                avatarUrl: localUser?.avatarUrl || `https://picsum.photos/seed/${identity.id}/100/100`,
                lastActive: localUser?.lastActive?.toISOString(),
                forcePasswordChange: localUser?.forcePasswordChange ?? false,
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

export default router;

