
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/tags - List or search tags
router.get('/', authenticate, async (req, res) => {
    try {
        const { search } = req.query;

        const where: any = {};
        if (search && typeof search === 'string') {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const tags = await prisma.tag.findMany({
            where,
            orderBy: { name: 'asc' },
            take: 50
        });

        res.json(tags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
