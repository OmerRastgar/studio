import express from 'express';
import { prisma } from '../lib/prisma';
import { generateToken, verifyPassword, hashPassword } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let isValidPassword = false;
        if (user.password.startsWith('dev_hash_')) {
            const expectedHash = `dev_hash_${password}`;
            isValidPassword = user.password === expectedHash;
        } else {
            isValidPassword = await verifyPassword(password, user.password);
        }

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });

        // Update last active
        await prisma.user.update({
            where: { id: user.id },
            data: { lastActive: new Date() }
        }).catch(console.error);

        // Audit Log
        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: user.name,
                userAvatarUrl: user.avatarUrl,
                action: 'User Login',
                details: `User ${user.email} logged in successfully`,
                severity: 'Low'
            }
        }).catch(console.error);

        // Set cookie
        res.cookie('auth_token', token, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
            path: '/',
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'customer' } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const user = await prisma.user.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role as 'admin' | 'auditor' | 'customer',
                status: 'Active',
                avatarUrl: `https://picsum.photos/seed/${email}/100/100`
            }
        });

        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });

        await prisma.auditLog.create({
            data: {
                id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userName: user.name,
                userAvatarUrl: user.avatarUrl,
                action: 'User Registration',
                details: `New user ${user.email} registered with role ${user.role}`,
                severity: 'Medium'
            }
        });

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                avatarUrl: true,
                lastActive: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.status !== 'Active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                avatarUrl: user.avatarUrl,
                lastActive: user.lastActive?.toISOString(),
                createdAt: user.createdAt.toISOString()
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
