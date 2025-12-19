import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { hashPassword } from '../lib/jwt';

const router = express.Router();

// Create a compliance user (Customer only)
router.post('/users', authenticate, requireRole(['customer']), async (req: AuthRequest, res) => {
    try {
        const { name, email, password } = req.body;
        const customerId = req.user!.userId;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'compliance',
                createdById: customerId,
            },
        });

        res.status(201).json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
        });
    } catch (error) {
        console.error('Error creating compliance user:', error);
        res.status(500).json({ error: 'Failed to create compliance user' });
    }
});

// List compliance users created by the customer
router.get('/users', authenticate, requireRole(['customer']), async (req: AuthRequest, res) => {
    try {
        const customerId = req.user!.userId;

        const users = await prisma.user.findMany({
            where: {
                role: 'compliance',
                OR: [
                    { createdById: customerId },
                    { linkedCustomerId: customerId }
                ]
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                sharedProjects: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        res.json(users);
    } catch (error) {
        console.error('Error fetching compliance users:', error);
        res.status(500).json({ error: 'Failed to fetch compliance users' });
    }
});

// Toggle project share for a compliance user (Customer only)
router.post('/share', authenticate, requireRole(['customer']), async (req: AuthRequest, res) => {
    try {
        const { userId, projectId, action } = req.body; // action: 'share' | 'unshare'
        const customerId = req.user!.userId;

        // Verify the customer owns the project
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                customerId: customerId,
            },
        });

        if (!project) {
            return res.status(403).json({ error: 'Project not found or access denied' });
        }

        // Verify the compliance user is linked to this customer OR created by them
        const targetUser = await prisma.user.findFirst({
            where: {
                id: userId,
                role: 'compliance',
                OR: [
                    { createdById: customerId },
                    { linkedCustomerId: customerId }
                ]
            },
        });

        if (!targetUser) {
            return res.status(403).json({ error: 'User not found or access denied' });
        }

        if (action === 'share') {
            await prisma.projectShare.upsert({
                where: {
                    userId_projectId: {
                        userId,
                        projectId,
                    },
                },
                create: {
                    userId,
                    projectId,
                },
                update: {},
            });
        } else if (action === 'unshare') {
            await prisma.projectShare.deleteMany({
                where: {
                    userId,
                    projectId,
                },
            });
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error managing project share:', error);
        res.status(500).json({ error: 'Failed to update project share' });
    }
});

// Get shared projects for logged-in compliance user
router.get('/dashboard', authenticate, requireRole(['compliance']), async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const shares = await prisma.projectShare.findMany({
            where: {
                userId,
            },
            include: {
                project: {
                    include: {
                        framework: true,
                        projectControls: {
                            select: {
                                progress: true,
                                evidenceCount: true
                            }
                        }
                    },
                },
            },
        });

        const projects = shares.map(share => ({
            ...share.project,
            sharedAt: share.createdAt,
        }));

        res.json(projects);
    } catch (error) {
        console.error('Error fetching compliance dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

// Get project details for compliance user (if shared)
router.get('/projects/:id', authenticate, requireRole(['compliance']), async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Verify project is shared with this user
        const share = await prisma.projectShare.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId: id,
                },
            },
        });

        if (!share) {
            return res.status(403).json({ error: 'Project not shared with this user' });
        }

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                },
                projectControls: {
                    include: {
                        control: {
                            include: {
                                tags: true
                            }
                        },
                        evidenceItems: {
                            include: {
                                uploadedBy: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Group controls by category (reuse logic from customer route)
        const controlsByCategory: Record<string, any[]> = {};
        project.projectControls.forEach(pc => {
            const category = pc.control.category || 'Uncategorized';
            if (!controlsByCategory[category]) {
                controlsByCategory[category] = [];
            }
            controlsByCategory[category].push({
                id: pc.id,
                controlId: pc.controlId,
                code: pc.control.code,
                title: pc.control.title,
                description: pc.control.description,
                tags: Array.isArray(pc.control.tags) ? pc.control.tags.map((t: any) => t.name) : [],
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: pc.evidenceItems,
                notes: pc.notes,
            });
        });

        const categories = Object.entries(controlsByCategory).map(([name, controls]) => ({
            name,
            controls,
            totalControls: controls.length,
            completedControls: controls.filter(c => c.progress === 100).length,
            progress: Math.round(controls.reduce((sum, c) => sum + c.progress, 0) / controls.length),
        }));

        res.json({
            success: true,
            data: {
                id: project.id,
                name: project.name,
                framework: project.framework,
                auditor: project.auditor,
                dueDate: project.dueDate,
                categories,
            }
        });
    } catch (error) {
        console.error('Compliance project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// Upload evidence for a shared project control
router.post('/projects/:projectId/controls/:controlId/evidence', authenticate, requireRole(['compliance']), async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.userId;
        const { projectId, controlId } = req.params;
        const { fileName, fileUrl, tags } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Verify project is shared with this user
        const share = await prisma.projectShare.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        if (!share) {
            return res.status(403).json({ error: 'Project not shared with this user' });
        }

        // Find or create project control
        // Note: Project controls should already exist if the project is initialized, 
        // but we verify it belongs to the project.
        const projectControl = await prisma.projectControl.findFirst({
            where: { projectId, controlId }
        });

        if (!projectControl) {
            return res.status(404).json({ error: 'Control not found in project' });
        }

        // Create evidence item
        const evidence = await prisma.evidenceItem.create({
            data: {
                projectControlId: projectControl.id,
                fileName,
                fileUrl,
                tags: tags || [],
                tagSource: 'manual',
                uploadedById: userId,
            }
        });

        // Update evidence count
        await prisma.projectControl.update({
            where: { id: projectControl.id },
            data: {
                evidenceCount: { increment: 1 }
            }
        });

        res.json({ success: true, data: evidence });
    } catch (error) {
        console.error('Compliance evidence upload error:', error);
        res.status(500).json({ error: 'Failed to upload evidence' });
    }
});

export default router;
