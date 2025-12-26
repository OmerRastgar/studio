import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/findings - List findings with filtering
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { severity, status, category, integrationId, page = '1', limit = '50' } = req.query;

        const where: any = {};
        if (severity) where.severity = severity;
        if (status) where.status = status;
        if (category) where.category = category;
        if (integrationId) where.integrationId = integrationId;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const [findings, total] = await Promise.all([
            prisma.finding.findMany({
                where,
                include: {
                    integration: { select: { name: true, vendor: true } },
                    assignedTo: { select: { name: true } },
                    _count: { select: { comments: true } }
                },
                orderBy: { firstSeenAt: 'desc' },
                skip,
                take: limitNum
            }),
            prisma.finding.count({ where })
        ]);

        res.json({
            success: true,
            data: findings,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Fetch findings error:', error);
        res.status(500).json({ error: 'Failed to fetch findings' });
    }
});

// GET /api/findings/stats - Dashboard statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
    try {
        const [total, bySeverity, byStatus, byCategory] = await Promise.all([
            prisma.finding.count(),
            prisma.finding.groupBy({
                by: ['severity'],
                _count: true
            }),
            prisma.finding.groupBy({
                by: ['status'],
                _count: true
            }),
            prisma.finding.groupBy({
                by: ['category'],
                _count: true
            })
        ]);

        const formatGroupBy = (data: any[]) => {
            return data.reduce((acc, item) => {
                acc[item.severity || item.status || item.category] = item._count;
                return acc;
            }, {});
        };

        res.json({
            success: true,
            data: {
                total,
                bySeverity: formatGroupBy(bySeverity),
                byStatus: formatGroupBy(byStatus),
                byCategory: formatGroupBy(byCategory)
            }
        });
    } catch (error) {
        console.error('Fetch stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/findings/:id - Get finding details
router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const finding = await prisma.finding.findUnique({
            where: { id },
            include: {
                integration: true,
                agent: true,
                assignedTo: { select: { name: true, email: true } },
                resolvedBy: { select: { name: true } },
                comments: {
                    include: { author: { select: { name: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!finding) {
            return res.status(404).json({ error: 'Finding not found' });
        }

        res.json({ success: true, data: finding });
    } catch (error) {
        console.error('Get finding error:', error);
        res.status(500).json({ error: 'Failed to get finding' });
    }
});

// PUT /api/findings/:id - Update finding
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status, assignedToId, dueDate } = req.body;

        const finding = await prisma.finding.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(assignedToId && { assignedToId }),
                ...(dueDate && { dueDate: new Date(dueDate) })
            }
        });

        res.json({ success: true, data: finding });
    } catch (error) {
        console.error('Update finding error:', error);
        res.status(500).json({ error: 'Failed to update finding' });
    }
});

// POST /api/findings/:id/resolve - Resolve finding
router.post('/:id/resolve', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const finding = await prisma.finding.update({
            where: { id },
            data: {
                status: 'resolved',
                resolvedAt: new Date(),
                resolvedById: userId
            }
        });

        res.json({ success: true, data: finding });
    } catch (error) {
        console.error('Resolve finding error:', error);
        res.status(500).json({ error: 'Failed to resolve finding' });
    }
});

// POST /api/findings/:id/comments - Add comment
router.post('/:id/comments', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const comment = await prisma.findingComment.create({
            data: {
                findingId: id,
                authorId: userId,
                content
            },
            include: {
                author: { select: { name: true } }
            }
        });

        res.status(201).json({ success: true, data: comment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// POST /api/findings - Create finding (for manual entries)
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const {
            title,
            description,
            severity,
            category,
            type,
            integrationId,
            affectedResource,
            recommendation
        } = req.body;

        const finding = await prisma.finding.create({
            data: {
                title,
                description,
                severity,
                category,
                type,
                integrationId,
                affectedResource,
                recommendation
            }
        });

        res.status(201).json({ success: true, data: finding });
    } catch (error) {
        console.error('Create finding error:', error);
        res.status(500).json({ error: 'Failed to create finding' });
    }
});

export default router;
