import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GraphService } from '../services/graph.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all admin routes
router.use(authenticate as any);
router.use(requireRole(['admin']) as any);

// =====================================
// METRICS & DASHBOARD
// =====================================

// GET /api/admin/metrics - System-wide metrics
router.get('/metrics', async (req: Request, res: Response) => {
    try {
        // Get counts
        const [
            totalProjects,
            totalUsers,
            totalFrameworks,
            totalControls,
            totalEvidence
        ] = await Promise.all([
            prisma.project.count(),
            prisma.user.count(),
            prisma.framework.count(),
            prisma.control.count(),
            prisma.evidenceItem.count()
        ]);

        // Get projects with compliance data (optimized select)
        const projects = await prisma.project.findMany({
            select: {
                projectControls: {
                    select: {
                        progress: true
                    }
                }
            }
        });

        // Calculate overall compliance
        let totalProgress = 0;
        let projectsWithControls = 0;
        projects.forEach((project: any) => {
            if (project.projectControls && project.projectControls.length > 0) {
                const avgProgress = project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / project.projectControls.length;
                totalProgress += avgProgress;
                projectsWithControls++;
            }
        });
        const overallCompliance = projectsWithControls > 0 ? Math.round(totalProgress / projectsWithControls) : 0;

        // Get user distribution by role
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { id: true }
        });

        // Get recent activity (last 7 days evidence uploads)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentEvidence = await prisma.evidenceItem.count({
            where: {
                createdAt: { gte: sevenDaysAgo }
            }
        });

        res.json({
            success: true,
            data: {
                totals: {
                    projects: totalProjects,
                    users: totalUsers,
                    frameworks: totalFrameworks,
                    controls: totalControls,
                    evidence: totalEvidence
                },
                compliance: {
                    overall: overallCompliance,
                    projectsWithControls
                },
                usersByRole: usersByRole.map((r: any) => ({
                    role: r.role,
                    count: r._count.id
                })),
                recentActivity: {
                    evidenceUploads: recentEvidence
                }
            }
        });
    } catch (error) {
        console.error('Admin metrics error:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// GET /api/admin/projects - All projects with filters
router.get('/projects', async (req: Request, res: Response) => {
    try {
        const { customerId, auditorId } = req.query;

        const where: any = {};
        if (customerId) where.customerId = customerId;
        if (auditorId) where.auditorId = auditorId;

        const projects = await prisma.project.findMany({
            where,
            include: {
                framework: true,
                customer: { select: { id: true, name: true, email: true } },
                auditor: { select: { id: true, name: true, email: true } },
                projectControls: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const projectsWithStats = projects.map((project: any) => {
            const totalControls = project.projectControls?.length || 0;
            const completedControls = project.projectControls?.filter((pc: any) => pc.progress === 100).length || 0;
            const avgProgress = totalControls > 0
                ? Math.round(project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / totalControls)
                : 0;

            return {
                id: project.id,
                name: project.name,
                framework: project.framework?.name,
                customer: project.customer,
                auditor: project.auditor,
                dueDate: project.dueDate,
                startDate: project.startDate,
                endDate: project.endDate,
                progress: avgProgress,
                controlsComplete: completedControls,
                controlsTotal: totalControls,
                createdAt: project.createdAt
            };
        });

        res.json({ success: true, data: projectsWithStats });
    } catch (error) {
        console.error('Admin projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/admin/projects/:id - Project details
router.get('/projects/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                framework: true,
                customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
                auditor: { select: { id: true, name: true, email: true, avatarUrl: true } },
                projectControls: {
                    include: {
                        control: {
                            include: { tags: true }
                        }
                    },
                    orderBy: { control: { code: 'asc' } }
                }
            }
        });

        // Fetch all evidence for the project (New Model)
        const allEvidence = await prisma.evidence.findMany({
            where: { projectId: id },
            include: {
                tags: true,
                controls: true,
                uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Group controls by category
        const categoriesMap = new Map();

        project.projectControls.forEach((pc: any) => {
            const categoryName = pc.control.category || 'General';
            if (!categoriesMap.has(categoryName)) {
                categoriesMap.set(categoryName, {
                    name: categoryName,
                    controls: [],
                    totalControls: 0,
                    completedControls: 0,
                    progress: 0
                });
            }

            const category = categoriesMap.get(categoryName);
            category.controls.push({
                id: pc.id,
                controlId: pc.controlId,
                code: pc.control.code,
                title: pc.control.title,
                description: pc.control.description,
                tags: pc.control.tags ? pc.control.tags.map((t: any) => t.name) : [],
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: allEvidence
                    .filter(ev => {
                        const explicitMatch = (ev as any).controls?.some((c: any) => c.id === pc.id);
                        const tagMatch = ev.tags.some(evt =>
                            Array.isArray(pc.control.tags) &&
                            pc.control.tags.some((pct: any) =>
                                (pct.name || '').trim().toLowerCase() === (evt.name || '').trim().toLowerCase()
                            )
                        );
                        return explicitMatch || tagMatch;
                    })
                    .map(e => ({
                        id: e.id,
                        fileName: e.fileName,
                        fileUrl: e.fileUrl,
                        type: e.type,
                        uploadedBy: e.uploadedBy,
                        createdAt: e.createdAt,
                        tags: e.tags.map(t => t.name)
                    })),
                notes: pc.notes
            });
            category.totalControls++;
            if (pc.progress === 100) category.completedControls++;
        });

        // Calculate category progress
        const categories = Array.from(categoriesMap.values()).map((cat: any) => {
            const totalProgress = cat.controls.reduce((sum: number, c: any) => sum + c.progress, 0);
            cat.progress = cat.totalControls > 0 ? Math.round(totalProgress / cat.totalControls) : 0;
            return cat;
        });

        // Calculate overall progress
        const totalControls = project.projectControls.length;
        const totalProgress = project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0);
        const overallProgress = totalControls > 0 ? Math.round(totalProgress / totalControls) : 0;

        res.json({
            success: true,
            data: {
                id: project.id,
                name: project.name,
                description: project.description,
                framework: project.framework,
                customer: project.customer,
                auditor: project.auditor,
                status: project.status,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                scope: project.scope,
                progress: overallProgress,
                categories
            }
        });
    } catch (error) {
        console.error('Admin project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// =====================================
// USER MANAGEMENT
// =====================================

// GET /api/admin/users - List all users
router.get('/users', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                status: true,
                createdAt: true,
                _count: {
                    select: {
                        customerProjects: true,
                        auditorProjects: true
                    }
                },
                managerId: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, managerId } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if email exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const data: any = {
            name,
            email,
            password: hashedPassword,
            role,
            avatarUrl: `https://picsum.photos/seed/${email}/100/100`
        };

        if (managerId) {
            data.managerId = managerId;
        }

        const user = await prisma.user.create({
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                managerId: true
            }
        });

        res.status(201).json({ success: true, data: user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id - Update user
router.put('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, email, role, password, managerId } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (managerId !== undefined) updateData.managerId = managerId;
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true
            }
        });

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user?.userId;

        // Prevent self-deletion
        if (id === userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await prisma.user.delete({ where: { id } });

        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// =====================================
// FRAMEWORK MANAGEMENT
// =====================================

// GET /api/admin/frameworks - List all frameworks
router.get('/frameworks', async (req: Request, res: Response) => {
    try {
        const frameworks = await prisma.framework.findMany({
            include: {
                _count: {
                    select: {
                        controls: true,
                        projects: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, data: frameworks });
    } catch (error) {
        console.error('Admin frameworks error:', error);
        res.status(500).json({ error: 'Failed to fetch frameworks' });
    }
});

// POST /api/admin/frameworks - Create framework
router.post('/frameworks', async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const framework = await prisma.framework.create({
            data: {
                name,
                description: description || ''
            }
        });

        res.status(201).json({ success: true, data: framework });
    } catch (error) {
        console.error('Create framework error:', error);
        res.status(500).json({ error: 'Failed to create framework' });
    }
});

// DELETE /api/admin/frameworks/:id - Delete framework and its controls
router.delete('/frameworks/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if framework exists
        const framework = await prisma.framework.findUnique({
            where: { id },
            include: {
                _count: { select: { projects: true } }
            }
        });

        if (!framework) {
            return res.status(404).json({ error: 'Framework not found' });
        }

        // Check if framework is in use by any projects
        if (framework._count.projects > 0) {
            return res.status(400).json({
                error: `Cannot delete framework - it is used by ${framework._count.projects} project(s). Remove the framework from all projects first.`
            });
        }

        // Delete all controls first, then delete framework
        await prisma.control.deleteMany({
            where: { frameworkId: id }
        });

        await prisma.framework.delete({
            where: { id }
        });

        res.json({ success: true, message: 'Framework deleted' });
    } catch (error) {
        console.error('Delete framework error:', error);
        res.status(500).json({ error: 'Failed to delete framework' });
    }
});

// GET /api/admin/frameworks/:id/controls - Get controls for framework
router.get('/frameworks/:id/controls', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const controls = await prisma.control.findMany({
            where: { frameworkId: id },
            orderBy: { code: 'asc' }
        });

        res.json({ success: true, data: controls });
    } catch (error) {
        console.error('Get controls error:', error);
        res.status(500).json({ error: 'Failed to fetch controls' });
    }
});

// POST /api/admin/frameworks/:id/controls/import - Import controls from CSV
router.post('/frameworks/:id/controls/import', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { controls } = req.body;

        // Validate framework exists
        const framework = await prisma.framework.findUnique({ where: { id } });
        if (!framework) {
            return res.status(404).json({ error: 'Framework not found' });
        }

        // Validate controls array
        if (!Array.isArray(controls) || controls.length === 0) {
            return res.status(400).json({ error: 'Controls array is required' });
        }

        // Import controls using upsert
        const results = await Promise.all(
            controls.map(async (control: any) => {
                const { code, title, description, category, tags } = control;

                if (!code || !title) {
                    return { code, error: 'Code and title are required' };
                }

                try {
                    // Process tags
                    let tagList: string[] = [];
                    if (Array.isArray(tags)) {
                        tagList = tags;
                    } else if (typeof tags === 'string') {
                        tagList = tags.split(';').map(t => t.trim()).filter(t => t);
                    }

                    // Upsert tags and get IDs
                    const tagConnect = [];
                    if (tagList.length > 0) {
                        for (const tagName of tagList) {
                            const tagId = await prisma.tag.upsert({
                                where: { name: tagName },
                                update: {},
                                create: { name: tagName }
                            });
                            tagConnect.push({ id: tagId.id });
                        }
                    }

                    const created = await prisma.control.upsert({
                        where: {
                            frameworkId_code: {
                                frameworkId: id,
                                code: code
                            }
                        },
                        update: {
                            title,
                            description: description || '',
                            category: category || 'General',
                            tags: { set: tagConnect } as any
                        },
                        create: {
                            frameworkId: id,
                            code,
                            title,
                            description: description || '',
                            category: category || 'General',
                            tags: { connect: tagConnect } as any
                        }
                    });

                    // Emit Graph Events for Tags
                    if (created && tagConnect.length > 0) {
                        tagConnect.forEach(t => {
                            GraphService.linkControlToTag(created.id, t.id).catch(e => console.error(e));
                        });
                    }

                    return { code, success: true, id: created.id };
                } catch (err) {
                    return { code, error: 'Failed to import' };
                }
            })
        );

        const imported = results.filter((r: any) => r.success).length;
        const failed = results.filter((r: any) => r.error).length;

        res.json({
            success: true,
            data: {
                imported,
                failed,
                total: controls.length,
                results
            }
        });
    } catch (error) {
        console.error('Import controls error:', error);
        res.status(500).json({ error: 'Failed to import controls' });
    }
});

// =====================================
// WORKFLOW TRACKING
// =====================================

// GET /api/admin/workflows/pending - Get pending workflow items
router.get('/workflows/pending', async (req: Request, res: Response) => {
    try {
        // Get projects with incomplete controls (pending review)
        const pendingProjects = await prisma.project.findMany({
            where: {
                projectControls: {
                    some: {
                        progress: { lt: 100 }
                    }
                }
            },
            include: {
                customer: { select: { id: true, name: true } },
                auditor: { select: { id: true, name: true } },
                projectControls: {
                    where: { progress: { lt: 100 } },
                    take: 5
                }
            },
            take: 10
        });

        // Get recent evidence needing review (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentEvidence = await prisma.evidenceItem.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo }
            },
            include: {
                projectControl: {
                    include: {
                        project: { select: { id: true, name: true } },
                        control: { select: { code: true, title: true } }
                    }
                },
                uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        const workflowItems = [
            ...pendingProjects.map((p: any) => ({
                type: 'project_incomplete',
                title: `Project needs attention: ${p.name}`,
                description: `${p.projectControls?.length || 0} controls pending`,
                entityId: p.id,
                entityType: 'project',
                assignee: p.auditor,
                customer: p.customer
            })),
            ...recentEvidence.map((e: any) => ({
                type: 'evidence_review',
                title: `New evidence: ${e.fileName}`,
                description: `For ${e.projectControl?.control?.code || 'N/A'} - ${e.projectControl?.control?.title || 'N/A'}`,
                entityId: e.projectControl?.projectId,
                entityType: 'evidence',
                uploadedBy: e.uploadedBy,
                createdAt: e.createdAt
            }))
        ];

        res.json({ success: true, data: workflowItems });
    } catch (error) {
        console.error('Pending workflows error:', error);
        res.status(500).json({ error: 'Failed to fetch pending workflows' });
    }
});

export default router;
