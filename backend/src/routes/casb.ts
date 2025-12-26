import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/casb/integrations - List integrations
router.get('/integrations', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;

        const integrations = await prisma.cASBIntegration.findMany({
            include: {
                createdBy: { select: { name: true } },
                _count: { select: { findings: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formatted = integrations.map(i => ({
            ...i,
            findingsCount: i._count.findings
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch integrations error:', error);
        res.status(500).json({ error: 'Failed to fetch integrations' });
    }
});

// POST /api/casb/integrations - Create integration
router.post('/integrations', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, type, vendor, authType, config, syncFrequency } = req.body;

        const integration = await prisma.cASBIntegration.create({
            data: {
                name,
                type,
                vendor,
                authType,
                config,
                syncFrequency: syncFrequency || 3600,
                createdById: userId
            },
            include: {
                createdBy: { select: { name: true } }
            }
        });

        res.status(201).json({ success: true, data: integration });
    } catch (error) {
        console.error('Create integration error:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

// GET /api/casb/integrations/:id - Get integration details
router.get('/integrations/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const integration = await prisma.cASBIntegration.findUnique({
            where: { id },
            include: {
                createdBy: { select: { name: true } },
                syncLogs: { orderBy: { startedAt: 'desc' }, take: 10 },
                _count: { select: { findings: true } }
            }
        });

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        res.json({ success: true, data: integration });
    } catch (error) {
        console.error('Get integration error:', error);
        res.status(500).json({ error: 'Failed to get integration' });
    }
});

// PUT /api/casb/integrations/:id - Update integration
router.put('/integrations/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, status, config, syncFrequency } = req.body;

        const integration = await prisma.cASBIntegration.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(status && { status }),
                ...(config && { config }),
                ...(syncFrequency && { syncFrequency })
            }
        });

        res.json({ success: true, data: integration });
    } catch (error) {
        console.error('Update integration error:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

// DELETE /api/casb/integrations/:id - Delete integration
router.delete('/integrations/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.cASBIntegration.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Integration deleted' });
    } catch (error) {
        console.error('Delete integration error:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

export default router;
