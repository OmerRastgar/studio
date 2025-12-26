import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/agents - List all agents
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const agents = await prisma.agent.findMany({
            include: {
                project: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        evidence: true,
                        findings: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: agents });
    } catch (error) {
        console.error('Fetch agents error:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// GET /api/agents/:id - Get agent details
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const agent = await prisma.agent.findUnique({
            where: { id },
            include: {
                project: true,
                evidence: {
                    take: 10,
                    orderBy: { uploadedAt: 'desc' }
                },
                findings: {
                    take: 10,
                    orderBy: { firstSeenAt: 'desc' }
                }
            }
        });

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        res.json({ success: true, data: agent });
    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: 'Failed to get agent' });
    }
});

// PUT /api/agents/:id - Update agent
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, projectId, status } = req.body;

        const agent = await prisma.agent.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(projectId !== undefined && { projectId }),
                ...(status && { status })
            }
        });

        res.json({ success: true, data: agent });
    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({ error: 'Failed to update agent' });
    }
});

// DELETE /api/agents/:id - Delete agent
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.agent.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Agent deleted' });
    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: 'Failed to delete agent' });
    }
});

export default router;
