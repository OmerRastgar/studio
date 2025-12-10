import express from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/jwt';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);
// Ensure only admin/manager can access
router.use(requireRole(['admin', 'manager']));

// GET /api/users - Get all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json({
            success: true,
            users: users.map(user => ({
                ...user,
                lastActive: user.lastActive?.toISOString(),
                createdAt: user.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
    try {
        const { name, email, role } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const defaultPassword = await hashPassword('password123');

        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                role,
                password: defaultPassword,
                avatarUrl: `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/100/100`,
                status: 'Active',
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true,
            },
        });

        // Audit Log
        // Assuming req.user is populated by authenticate middleware
        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Created',
                details: `New user ${name} (${email}) created with role ${role}`,
                severity: 'Medium',
            },
        });

        res.json({
            success: true,
            user: {
                ...user,
                lastActive: user.lastActive?.toISOString(),
                createdAt: user.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const { name, role, status } = req.body;
        const userId = req.params.id;

        if (!name || !role) {
            return res.status(400).json({ error: 'Name and role are required' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name,
                role,
                status: status || existingUser.status,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true,
            },
        });

        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Updated',
                details: `User ${updatedUser.name} (${updatedUser.email}) updated - Role: ${role}${status ? `, Status: ${status}` : ''}`,
                severity: 'Medium',
            },
        });

        res.json({
            success: true,
            user: {
                ...updatedUser,
                lastActive: updatedUser.lastActive?.toISOString(),
                createdAt: updatedUser.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (existingUser.role === 'admin') {
            const adminCount = await prisma.user.count({
                where: { role: 'admin' },
            });

            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot delete the last admin user' });
            }
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        const adminName = (req as any).user?.name || 'System Admin';

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: adminName,
                action: 'User Deleted',
                details: `User ${existingUser.name} (${existingUser.email}) was deleted`,
                severity: 'High',
            },
        });

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
