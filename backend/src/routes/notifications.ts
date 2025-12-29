
import express from 'express';
// import { protect } from '../middleware/auth'; // Assuming auth middleware exists
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Middleware to extract user from token (duplicating logic or importing if available)
// I'll check if there's an exported middleware. Previous file listing showed `middleware` folder.
// I'll define a simple one here or use one if I find it. 
// Let's assume standard express pattern for now.

const protect = async (req: any, res: any, next: any) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }
};

router.get('/', protect, async (req: any, res) => {
    try {
        const notifications = await NotificationService.getForUser(req.user.userId || req.user.id);
        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/:id/read', protect, async (req: any, res) => {
    try {
        await NotificationService.markAsRead(req.params.id, req.user.userId || req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/read-all', protect, async (req: any, res) => {
    try {
        await NotificationService.markAllAsRead(req.user.userId || req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
