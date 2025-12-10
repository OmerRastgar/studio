import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware - managers and admins only
router.use(authenticate as any);
router.use(requireRole(['admin', 'manager']) as any);

// =====================================
// PROJECT MANAGEMENT
// =====================================

// GET /api/manager/projects - List all projects
router.get('/projects', async (req: Request, res: Response) => {
    try {
        const projects = await prisma.project.findMany({
            include: {
                framework: true,
                customer: { select: { id: true, name: true, email: true } },
                auditor: { select: { id: true, name: true, email: true } },
                reviewerAuditor: { select: { id: true, name: true, email: true } },
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
                reviewer: project.reviewerAuditor,
                dueDate: project.dueDate,
                startDate: project.startDate,
                endDate: project.endDate,
                progress: avgProgress,
                controlsComplete: completedControls,
                controlsTotal: totalControls,
                createdAt: project.createdAt,
                status: project.status
            };
        });

        res.json({ success: true, data: projectsWithStats });
    } catch (error) {
        console.error('Manager projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// PATCH /api/manager/projects/:id - Edit project details
router.patch('/projects/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, startDate, dueDate, endDate } = req.body;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (startDate) updateData.startDate = new Date(startDate);
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (endDate) updateData.endDate = new Date(endDate);

        const updated = await prisma.project.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, data: updated });
    } catch (error) {
        console.error('Edit project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// GET /api/manager/projects/:id - Project details
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
                        control: true,
                        evidenceItems: {
                            include: {
                                uploadedBy: { select: { id: true, name: true } }
                            }
                        },
                        projectEvidence: {
                            include: {
                                uploadedBy: { select: { id: true, name: true } }
                            }
                        }
                    },
                    orderBy: { control: { code: 'asc' } }
                }
            }
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
                tags: pc.control.tags,
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: [...pc.evidenceItems, ...pc.projectEvidence],
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
                framework: project.framework,
                customer: project.customer,
                auditor: project.auditor,
                status: project.status,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                progress: overallProgress,
                categories
            }
        });
    } catch (error) {
        console.error('Manager project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// =====================================
// DASHBOARD METRICS
// =====================================

// GET /api/manager/dashboard - Aggregated metrics
router.get('/dashboard', async (req: Request, res: Response) => {
    try {
        // Get counts and stats
        const [
            totalProjects,
            pendingProjects,
            totalCustomers,
            totalAuditors,
            projectsByStatus
        ] = await Promise.all([
            prisma.project.count(),
            prisma.project.count({ where: { status: 'pending' } }),
            prisma.user.count({ where: { role: 'customer' } }),
            prisma.user.count({ where: { role: 'auditor' } }),
            prisma.project.groupBy({
                by: ['status'],
                _count: { id: true }
            })
        ]);

        // Get overall compliance
        const projects = await prisma.project.findMany({
            where: { status: 'approved' },
            include: { projectControls: true }
        });

        let totalProgress = 0;
        let projectsWithControls = 0;
        projects.forEach((project: any) => {
            if (project.projectControls?.length > 0) {
                const avg = project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / project.projectControls.length;
                totalProgress += avg;
                projectsWithControls++;
            }
        });
        const avgCompliance = projectsWithControls > 0 ? Math.round(totalProgress / projectsWithControls) : 0;

        res.json({
            success: true,
            data: {
                totals: {
                    projects: totalProjects,
                    pendingApprovals: pendingProjects,
                    customers: totalCustomers,
                    auditors: totalAuditors
                },
                compliance: avgCompliance,
                projectsByStatus: projectsByStatus.map((s: any) => ({
                    status: s.status,
                    count: s._count.id
                }))
            }
        });
    } catch (error) {
        console.error('Manager dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
});

// =====================================
// TEAM PERFORMANCE
// =====================================

// GET /api/manager/team-performance - Auditor workload and completion rates
router.get('/team-performance', async (req: Request, res: Response) => {
    try {
        const auditors = await prisma.user.findMany({
            where: { role: 'auditor' },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                auditorProjects: {
                    include: {
                        projectControls: true
                    }
                }
            }
        });

        const auditorStats = auditors.map((auditor: any) => {
            const projectCount = auditor.auditorProjects.length;
            let totalProgress = 0;
            let controlsCount = 0;

            auditor.auditorProjects.forEach((project: any) => {
                if (project.projectControls) {
                    project.projectControls.forEach((pc: any) => {
                        totalProgress += pc.progress;
                        controlsCount++;
                    });
                }
            });

            return {
                id: auditor.id,
                name: auditor.name,
                email: auditor.email,
                avatarUrl: auditor.avatarUrl,
                projectCount,
                avgCompletion: controlsCount > 0 ? Math.round(totalProgress / controlsCount) : 0,
                workload: projectCount > 5 ? 'high' : projectCount > 2 ? 'medium' : 'low'
            };
        });

        res.json({ success: true, data: auditorStats });
    } catch (error) {
        console.error('Team performance error:', error);
        res.status(500).json({ error: 'Failed to fetch team performance' });
    }
});

// =====================================
// CUSTOMER MANAGEMENT
// =====================================

// GET /api/manager/customers - Customer list with project summaries
router.get('/customers', async (req: Request, res: Response) => {
    try {
        const customers = await prisma.user.findMany({
            where: { role: 'customer' },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
                customerProjects: {
                    include: {
                        framework: { select: { name: true } },
                        projectControls: true
                    }
                }
            }
        });

        const customerStats = customers.map((customer: any) => {
            const projectCount = customer.customerProjects.length;
            let totalProgress = 0;
            let controlsCount = 0;

            customer.customerProjects.forEach((project: any) => {
                if (project.projectControls) {
                    project.projectControls.forEach((pc: any) => {
                        totalProgress += pc.progress;
                        controlsCount++;
                    });
                }
            });

            return {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                avatarUrl: customer.avatarUrl,
                createdAt: customer.createdAt,
                projectCount,
                avgCompliance: controlsCount > 0 ? Math.round(totalProgress / controlsCount) : 0,
                pendingProjects: customer.customerProjects.filter((p: any) => p.status === 'pending').length
            };
        });

        res.json({ success: true, data: customerStats });
    } catch (error) {
        console.error('Customers list error:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// GET /api/manager/customers/:id - Customer profile with projects
router.get('/customers/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const customer = await prisma.user.findFirst({
            where: { id, role: 'customer' },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
                customerProjects: {
                    include: {
                        framework: { select: { name: true } },
                        auditor: { select: { id: true, name: true, email: true } },
                        projectControls: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const projects = customer.customerProjects.map((project: any) => {
            const totalControls = project.projectControls?.length || 0;
            const completedControls = project.projectControls?.filter((pc: any) => pc.progress === 100).length || 0;
            const avgProgress = totalControls > 0
                ? Math.round(project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / totalControls)
                : 0;

            return {
                id: project.id,
                name: project.name,
                framework: project.framework?.name,
                status: project.status,
                auditor: project.auditor,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                progress: avgProgress,
                controlsComplete: completedControls,
                controlsTotal: totalControls,
                createdAt: project.createdAt
            };
        });

        res.json({
            success: true,
            data: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
                avatarUrl: customer.avatarUrl,
                createdAt: customer.createdAt,
                projects
            }
        });
    } catch (error) {
        console.error('Customer profile error:', error);
        res.status(500).json({ error: 'Failed to fetch customer profile' });
    }
});

// =====================================
// ALERTS & PENDING ITEMS
// =====================================

// GET /api/manager/alerts - Pending approvals, overdue projects, bottlenecks
router.get('/alerts', async (req: Request, res: Response) => {
    try {
        // Pending project approvals
        const pendingProjects = await prisma.project.findMany({
            where: { status: 'pending' },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                framework: { select: { name: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Overdue projects (approved projects past due date)
        const now = new Date();
        const overdueProjects = await prisma.project.findMany({
            where: {
                status: 'approved',
                dueDate: { lt: now }
            },
            include: {
                customer: { select: { id: true, name: true } },
                auditor: { select: { id: true, name: true } }
            }
        });

        // Stalled projects (approved but less than 20% progress)
        const stalledProjects = await prisma.project.findMany({
            where: { status: 'approved' },
            include: {
                customer: { select: { id: true, name: true } },
                auditor: { select: { id: true, name: true } },
                projectControls: true
            }
        });

        const stalled = stalledProjects.filter((project: any) => {
            if (!project.projectControls?.length) return false;
            const avgProgress = project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / project.projectControls.length;
            return avgProgress < 20;
        });

        const alerts = [
            ...pendingProjects.map((p: any) => ({
                type: 'pending_approval',
                severity: 'warning',
                title: `Project Approval Required: ${p.name}`,
                description: `${p.customer?.name} requested ${p.framework?.name || 'Unknown'} audit`,
                entityId: p.id,
                entityType: 'project',
                createdAt: p.createdAt
            })),
            ...overdueProjects.map((p: any) => ({
                type: 'overdue',
                severity: 'error',
                title: `Overdue: ${p.name}`,
                description: `Assigned to ${p.auditor?.name || 'Unassigned'}`,
                entityId: p.id,
                entityType: 'project',
                dueDate: p.dueDate
            })),
            ...stalled.map((p: any) => ({
                type: 'stalled',
                severity: 'warning',
                title: `Stalled Project: ${p.name}`,
                description: `Less than 20% progress - needs attention`,
                entityId: p.id,
                entityType: 'project'
            }))
        ];

        res.json({ success: true, data: alerts });
    } catch (error) {
        console.error('Alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// =====================================
// PROJECT APPROVAL & ASSIGNMENT
// =====================================

// PUT /api/manager/projects/:id/approve - Approve a project and create controls
router.put('/projects/:id/approve', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { auditorId, reviewerAuditorId, dueDate } = req.body;

        // Get project with framework
        const project = await prisma.project.findUnique({
            where: { id },
            include: { framework: { include: { controls: true } } }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.status !== 'pending') {
            return res.status(400).json({ error: 'Project is not pending approval' });
        }

        // Update project status and optionally assign auditor
        const updateData: any = { status: 'approved' };
        if (auditorId) updateData.auditorId = auditorId;
        if (reviewerAuditorId) updateData.reviewerAuditorId = reviewerAuditorId;
        if (dueDate) updateData.dueDate = new Date(dueDate);

        await prisma.project.update({
            where: { id },
            data: updateData
        });

        // Create project controls from framework controls
        if (project.framework?.controls?.length) {
            const controlsData = project.framework.controls.map((control: any) => ({
                projectId: id,
                controlId: control.id,
                progress: 0,
                evidenceCount: 0
            }));

            await prisma.projectControl.createMany({
                data: controlsData
            });
        }

        res.json({
            success: true,
            message: `Project approved with ${project.framework?.controls?.length || 0} controls created`
        });
    } catch (error) {
        console.error('Approve project error:', error);
        res.status(500).json({ error: 'Failed to approve project' });
    }
});

// PUT /api/manager/projects/:id/reject - Reject a project with reason
router.put('/projects/:id/reject', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const project = await prisma.project.findUnique({ where: { id } });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (project.status !== 'pending') {
            return res.status(400).json({ error: 'Project is not pending approval' });
        }

        await prisma.project.update({
            where: { id },
            data: {
                status: 'rejected',
                rejectionReason: reason.trim()
            }
        });

        res.json({ success: true, message: 'Project rejected' });
    } catch (error) {
        console.error('Reject project error:', error);
        res.status(500).json({ error: 'Failed to reject project' });
    }
});

// PUT /api/manager/projects/:id/assign - Assign auditor to project
router.put('/projects/:id/assign', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { auditorId, reviewerAuditorId, dueDate } = req.body;

        if (!auditorId) {
            return res.status(400).json({ error: 'Auditor ID is required' });
        }

        if (!reviewerAuditorId) {
            return res.status(400).json({ error: 'Reviewer ID is required. Every project must have a reviewer.' });
        }

        if (auditorId === reviewerAuditorId) {
            return res.status(400).json({ error: 'Auditor and Reviewer cannot be the same person.' });
        }

        // Verify auditor exists
        const auditor = await prisma.user.findFirst({
            where: { id: auditorId, role: 'auditor' }
        });

        if (!auditor) {
            return res.status(404).json({ error: 'Auditor not found' });
        }

        const updateData: any = { auditorId };
        if (reviewerAuditorId) updateData.reviewerAuditorId = reviewerAuditorId;
        if (dueDate) updateData.dueDate = new Date(dueDate);

        await prisma.project.update({
            where: { id },
            data: updateData
        });

        res.json({ success: true, message: `Project assigned to ${auditor.name}` });
    } catch (error) {
        console.error('Assign project error:', error);
        res.status(500).json({ error: 'Failed to assign project' });
    }
});

// GET /api/manager/auditors - List available auditors for assignment
router.get('/auditors', async (req: Request, res: Response) => {
    try {
        const auditors = await prisma.user.findMany({
            where: { role: 'auditor', status: 'Active' },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                _count: { select: { auditorProjects: true } }
            }
        });

        res.json({ success: true, data: auditors });
    } catch (error) {
        console.error('Auditors list error:', error);
        res.status(500).json({ error: 'Failed to fetch auditors' });
    }
});

// GET /api/manager/auditors/:id - Detailed auditor stats
router.get('/auditors/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const auditor = await prisma.user.findFirst({
            where: { id, role: 'auditor' },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true,
                lastActive: true,
                auditorProjects: {
                    include: {
                        framework: { select: { name: true } },
                        projectControls: true,
                        customer: { select: { name: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                reviewerProjects: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!auditor) {
            return res.status(404).json({ error: 'Auditor not found' });
        }

        // Calculate stats
        const totalProjects = auditor.auditorProjects.length;
        const completedProjects = auditor.auditorProjects.filter((p: any) => p.status === 'completed').length;
        const activeProjects = auditor.auditorProjects.filter((p: any) => p.status === 'approved').length;

        let totalProgress = 0;
        let controlsCount = 0;
        auditor.auditorProjects.forEach((project: any) => {
            if (project.projectControls) {
                project.projectControls.forEach((pc: any) => {
                    totalProgress += pc.progress;
                    controlsCount++;
                });
            }
        });
        const avgCompletion = controlsCount > 0 ? Math.round(totalProgress / controlsCount) : 0;

        const projects = auditor.auditorProjects.map((project: any) => {
            const projectProgress = project.projectControls?.length > 0
                ? Math.round(project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / project.projectControls.length)
                : 0;
            return {
                id: project.id,
                name: project.name,
                customer: project.customer?.name,
                framework: project.framework?.name,
                status: project.status,
                progress: projectProgress,
                controlsCount: project.projectControls?.length || 0,
                dueDate: project.dueDate,
                createdAt: project.createdAt
            };
        });

        res.json({
            success: true,
            data: {
                id: auditor.id,
                name: auditor.name,
                email: auditor.email,
                avatarUrl: auditor.avatarUrl,
                createdAt: auditor.createdAt,
                lastActive: auditor.lastActive,
                stats: {
                    totalProjects,
                    completedProjects,
                    activeProjects,
                    reviewingProjects: auditor.reviewerProjects?.length || 0,
                    avgCompletion,
                    workload: totalProjects > 5 ? 'high' : totalProjects > 2 ? 'medium' : 'low'
                },
                projects
            }
        });
    } catch (error) {
        console.error('Auditor detail error:', error);
        res.status(500).json({ error: 'Failed to fetch auditor details' });
    }
});



export default router;
