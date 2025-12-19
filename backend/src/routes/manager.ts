import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { webhookService } from '../services/webhookService';
import { GraphService } from '../services/graph.service';
import bcrypt from 'bcryptjs';

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
        const user = (req as any).user;
        const whereClause: any = {};

        // Manager Isolation: Only see projects belonging to Managed Customers or Managed Auditors
        if (user.role === 'manager') {
            whereClause.OR = [
                { customer: { managerId: user.userId } },
                { auditor: { managerId: user.userId } },
                { reviewerAuditor: { managerId: user.userId } },
                // Also include projects where this manager is explicitly the customer's linked manager
                // (Redundant if customer.managerId is covered, but safe)
            ];
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
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
        const user = (req as any).user;
        const projectWhere: any = {};
        const customerWhere: any = { role: 'customer' };
        const auditorWhere: any = { role: 'auditor' };

        if (user.role === 'manager') {
            customerWhere.managerId = user.userId;
            auditorWhere.managerId = user.userId;

            projectWhere.OR = [
                { customer: { managerId: user.userId } },
                { auditor: { managerId: user.userId } },
                { reviewerAuditor: { managerId: user.userId } }
            ];
        }

        const [
            totalProjects,
            pendingProjects,
            totalCustomers,
            totalAuditors,
            projectsByStatus
        ] = await Promise.all([
            prisma.project.count({ where: projectWhere }),
            prisma.project.count({ where: { ...projectWhere, status: 'pending' } }),
            prisma.user.count({ where: customerWhere }),
            prisma.user.count({ where: auditorWhere }),
            prisma.project.groupBy({
                by: ['status'],
                where: projectWhere,
                _count: { id: true }
            })
        ]);

        // Get overall compliance
        const projects = await prisma.project.findMany({
            where: { ...projectWhere, status: 'approved' },
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
        const user = (req as any).user;
        const whereClause: any = { role: 'auditor' };

        if (user.role === 'manager') {
            whereClause.managerId = user.userId;
        }

        const auditors = await prisma.user.findMany({
            where: whereClause,
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
        const user = (req as any).user;
        const whereClause: any = { role: 'customer' };

        if (user.role === 'manager') {
            whereClause.managerId = user.userId;
        }

        const customers = await prisma.user.findMany({
            where: whereClause,
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
        const user = (req as any).user;
        const whereClause: any = { id, role: 'customer' };

        if (user.role === 'manager') {
            whereClause.managerId = user.userId;
        }

        const customer = await prisma.user.findFirst({
            where: whereClause,
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
        const user = (req as any).user;
        const projectWhere: any = {};

        if (user.role === 'manager') {
            projectWhere.customer = { managerId: user.userId };
            // Alternatively, could include auditor check, but alerts are primarily about customer projects
            // Using OR for comprehensive coverage if auditor is managed but customer isn't (rare)
            projectWhere.OR = [
                { customer: { managerId: user.userId } },
                { auditor: { managerId: user.userId } },
                { reviewerAuditor: { managerId: user.userId } }
            ];
        }

        // Pending project approvals
        const pendingProjects = await prisma.project.findMany({
            where: { ...projectWhere, status: 'pending' },
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
                ...projectWhere,
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
            where: { ...projectWhere, status: 'approved' },
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

        // Update project status and REQUIRE auditor/reviewer
        if (!auditorId || !reviewerAuditorId) {
            return res.status(400).json({ error: 'Both Auditor and Reviewer must be assigned.' });
        }

        if (auditorId === reviewerAuditorId) {
            return res.status(400).json({ error: 'Auditor and Reviewer cannot be the same person.' });
        }

        const updateData: any = {
            status: 'in_progress',
            auditorId,
            reviewerAuditorId
        };
        if (dueDate) updateData.dueDate = new Date(dueDate);

        await prisma.project.update({
            where: { id },
            data: updateData
        });

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

        // Fetch user details for webhook
        const [auditor, reviewer] = await Promise.all([
            prisma.user.findUnique({ where: { id: auditorId } }),
            prisma.user.findUnique({ where: { id: reviewerAuditorId } })
        ]);

        // Send n8n webhook
        if (auditor && reviewer) {
            await webhookService.sendProjectApproved({
                projectId: id,
                projectName: project.name,
                customerName: project.customerName,
                framework: project.framework?.name || 'Unknown',
                auditorName: auditor.name,
                auditorEmail: auditor.email,
                reviewerName: reviewer.name,
                reviewerEmail: reviewer.email,
                dueDate: project.dueDate ? project.dueDate.toISOString() : undefined
            });

            // Sync to Graph (Async)
            await GraphService.assignAuditor(id, auditorId);
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

        // Sync to Graph (Async)
        await GraphService.assignAuditor(id, auditorId);

        res.json({ success: true, message: `Project assigned to ${auditor.name}` });
    } catch (error) {
        console.error('Assign project error:', error);
        res.status(500).json({ error: 'Failed to assign project' });
    }
});

// GET /api/manager/auditors - List available auditors for assignment
router.get('/auditors', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const whereClause: any = { role: 'auditor', status: 'Active' };

        if (user.role === 'manager') {
            whereClause.managerId = user.userId;
        }

        const auditors = await prisma.user.findMany({
            where: whereClause,
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
// GET /api/manager/auditors/:id - Detailed auditor stats
router.get('/auditors/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const whereClause: any = { id, role: 'auditor' };

        if (user.role === 'manager') {
            whereClause.managerId = user.userId;
        }

        const auditor = await prisma.user.findFirst({
            where: whereClause,
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
                        projectControls: {
                            select: {
                                progress: true,
                                isFlagged: true // Count mistakes
                            }
                        },
                        customer: { select: { name: true } },
                        timeLogs: true // Include logs for hours
                    },
                    orderBy: { createdAt: 'desc' }
                },
                reviewerProjects: {
                    include: {
                        framework: { select: { name: true } },
                        projectControls: {
                            select: {
                                progress: true,
                                isFlagged: true
                            }
                        },
                        customer: { select: { name: true } },
                        timeLogs: true
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!auditor) {
            return res.status(404).json({ error: 'Auditor not found' });
        }

        // Helper to format project data
        const formatProject = (project: any) => {
            const projectProgress = project.projectControls?.length > 0
                ? Math.round(project.projectControls.reduce((sum: number, pc: any) => sum + pc.progress, 0) / project.projectControls.length)
                : 0;

            // Calculate hours from timeLogs
            const durationSeconds = project.timeLogs.reduce((sum: number, log: any) => sum + log.durationSeconds, 0);
            const reviewSeconds = project.timeLogs.reduce((sum: number, log: any) => sum + log.reviewSeconds, 0);
            const hours = Math.round((durationSeconds / 3600) * 10) / 10;
            const reviewHours = Math.round((reviewSeconds / 3600) * 10) / 10;
            const auditHours = Math.round(((durationSeconds - reviewSeconds) / 3600) * 10) / 10;

            // Count mistakes (Flagged items)
            const mistakes = project.projectControls.filter((pc: any) => pc.isFlagged).length;

            return {
                id: project.id,
                name: project.name,
                customer: project.customer?.name,
                framework: project.framework?.name,
                status: project.status,
                progress: projectProgress,
                controlsCount: project.projectControls?.length || 0,
                dueDate: project.dueDate,
                createdAt: project.createdAt,
                auditHours,
                reviewHours,
                totalHours: hours,
                mistakes
            };
        };

        const auditProjects = auditor.auditorProjects.map(formatProject);
        const reviewerProjects = auditor.reviewerProjects.map(formatProject);

        // Calculate Global Stats
        const completedProjects = [...auditor.auditorProjects, ...auditor.reviewerProjects]
            .filter((p: any) => p.status === 'completed' || p.status === 'approved').length;

        // Active = "in review" or working
        const activeProjects = [...auditor.auditorProjects, ...auditor.reviewerProjects]
            .filter((p: any) => p.status !== 'completed' && p.status !== 'rejected').length;

        const totalAuditHours = auditProjects.reduce((sum, p) => sum + p.auditHours, 0);
        const totalReviewHours = reviewerProjects.reduce((sum, p) => sum + p.reviewHours, 0);
        const totalMistakes = auditProjects.reduce((sum, p) => sum + p.mistakes, 0) + reviewerProjects.reduce((sum, p) => sum + p.mistakes, 0);

        let totalProgressSum = 0;
        let totalControlsCount = 0;
        [...auditor.auditorProjects, ...auditor.reviewerProjects].forEach((project: any) => {
            if (project.projectControls) {
                project.projectControls.forEach((pc: any) => {
                    totalProgressSum += pc.progress;
                    totalControlsCount++;
                });
            }
        });
        const avgCompletion = totalControlsCount > 0 ? Math.round(totalProgressSum / totalControlsCount) : 0;

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
                    activeProjects,
                    completedProjects,
                    avgCompletion,
                    totalAuditHours: Math.round(totalAuditHours * 10) / 10,
                    totalReviewHours: Math.round(totalReviewHours * 10) / 10,
                    totalMistakes,
                    workload: activeProjects > 5 ? 'high' : activeProjects > 2 ? 'medium' : 'low'
                },
                auditProjects,
                reviewerProjects
            }
        });
    } catch (error) {
        console.error('Auditor detail error:', error);
        res.status(500).json({ error: 'Failed to fetch auditor details' });
    }
});



// =====================================
// USER MANAGEMENT FOR MANAGERS
// =====================================

// POST /api/manager/users - Create new user (Auditor or Customer) under this manager
router.post('/users', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { name, email, password, role } = req.body;

        if (user.role !== 'manager') {
            return res.status(403).json({ error: 'Only managers can create users via this endpoint' });
        }

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (role !== 'auditor' && role !== 'customer') {
            return res.status(400).json({ error: 'Managers can only create Auditors or Customers' });
        }

        // Check if email exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                avatarUrl: `https://picsum.photos/seed/${email}/100/100`,
                managerId: user.userId // Enforce Hierarchy
            },
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

        // If Auditor, create profile
        if (role === 'auditor') {
            await prisma.auditor.create({
                data: {
                    id: newUser.id,
                    userId: newUser.id,
                    experience: '0 years', // Default
                    certifications: []
                }
            });
        }

        res.status(201).json({ success: true, data: newUser });
    } catch (error) {
        console.error('Manager create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

export default router;
