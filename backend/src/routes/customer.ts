import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware to all customer routes
router.use(authenticate as any);
router.use(requireRole(['customer', 'admin']) as any);

// GET /api/customer/dashboard - Dashboard summary for logged-in customer
router.get('/dashboard', async (req, res) => {
    try {
        // Get user from request (set by auth middleware)
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get customer's projects with framework and auditor info
        const projects = await prisma.project.findMany({
            where: { customerId: userId },
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                },
                projectControls: {
                    include: { control: true }
                }
            }
        });

        // Calculate stats
        const projectStats = projects.map(project => {
            const totalControls = project.projectControls.length;
            const completedControls = project.projectControls.filter(pc => pc.progress === 100).length;
            const avgProgress = totalControls > 0
                ? Math.round(project.projectControls.reduce((sum, pc) => sum + pc.progress, 0) / totalControls)
                : 0;
            const totalEvidence = project.projectControls.reduce((sum, pc) => sum + pc.evidenceCount, 0);

            return {
                id: project.id,
                name: project.name,
                framework: project.framework?.name || 'No Framework',
                frameworkId: project.frameworkId,
                progress: avgProgress,
                controlsComplete: completedControls,
                controlsTotal: totalControls,
                evidenceCount: totalEvidence,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                status: (project as any).status || 'approved',
                rejectionReason: (project as any).rejectionReason || null,
                auditor: project.auditor,
            };
        });

        // Overall stats
        const totalProjects = projects.length;
        const totalEvidence = projectStats.reduce((sum, p) => sum + p.evidenceCount, 0);
        const overallCompliance = projectStats.length > 0
            ? Math.round(projectStats.reduce((sum, p) => sum + p.progress, 0) / projectStats.length)
            : 0;

        // Get assigned auditors (deduplicated)
        const auditorsMap = new Map();
        projects.forEach((p: any) => {
            if (p.auditor) {
                auditorsMap.set(p.auditor.id, p.auditor);
            }
        });
        const assignedAuditors = Array.from(auditorsMap.values());

        res.json({
            success: true,
            data: {
                stats: {
                    totalProjects,
                    totalEvidence,
                    overallCompliance,
                },
                projects: projectStats,
                assignedAuditors
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// GET /api/customer/projects - List all projects for customer
router.get('/projects', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const projects = await prisma.project.findMany({
            where: { customerId: userId },
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true }
                },
                projectControls: true
            }
        });

        res.json({ success: true, data: projects });
    } catch (error) {
        console.error('Projects list error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/customer/projects/:id - Get project details with controls
router.get('/projects/:id', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const project = await prisma.project.findFirst({
            where: { id, customerId: userId },
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                },
                projectControls: {
                    include: {
                        control: true,
                        evidenceItems: {
                            include: {
                                uploadedBy: {
                                    select: { id: true, name: true }
                                }
                            }
                        },
                        projectEvidence: {
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

        // Group controls by category
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
                tags: pc.control.tags,
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: [...pc.evidenceItems, ...pc.projectEvidence],
                notes: pc.notes,
            });
        });

        // Calculate category progress
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
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                categories,
            }
        });
    } catch (error) {
        console.error('Project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// POST /api/customer/projects/:projectId/controls/:controlId/evidence - Upload evidence
router.post('/projects/:projectId/controls/:controlId/evidence', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { projectId, controlId } = req.params;
        const { fileName, fileUrl, tags } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify project belongs to customer
        const project = await prisma.project.findFirst({
            where: { id: projectId, customerId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Find or create project control
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
        console.error('Evidence upload error:', error);
        res.status(500).json({ error: 'Failed to upload evidence' });
    }
});

// GET /api/customer/frameworks - List available frameworks for project creation
router.get('/frameworks', async (req, res) => {
    try {
        const frameworks = await prisma.framework.findMany({
            select: {
                id: true,
                name: true,
                description: true,
                _count: { select: { controls: true } }
            },
            orderBy: { name: 'asc' }
        });

        res.json({ success: true, data: frameworks });
    } catch (error) {
        console.error('Frameworks list error:', error);
        res.status(500).json({ error: 'Failed to fetch frameworks' });
    }
});

// POST /api/customer/projects - Create a new project request
router.post('/projects', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { name, frameworkId, startDate, endDate, dueDate, description, scope } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!name || !frameworkId || !startDate || !endDate || !dueDate || !scope) {
            return res.status(400).json({ error: 'Project name, framework, scope, start date, end date, and due date are required' });
        }

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify framework exists
        const framework = await prisma.framework.findUnique({
            where: { id: frameworkId }
        });

        if (!framework) {
            return res.status(404).json({ error: 'Framework not found' });
        }

        // Create project with pending status
        const project = await prisma.project.create({
            data: {
                name,
                customerName: user.name,
                customerId: userId,
                frameworkId,
                status: 'pending',
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                dueDate: new Date(dueDate),
                description,
                scope
            },
            include: {
                framework: { select: { name: true } }
            }
        });

        res.status(201).json({
            success: true,
            data: {
                id: project.id,
                name: project.name,
                framework: project.framework?.name,
                status: project.status,
                createdAt: project.createdAt
            },
            message: 'Project request submitted! Awaiting manager approval.'
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project request' });
    }
});

// GET /api/customer/requests - List audit requests for the customer
router.get('/requests', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const requests = await prisma.auditRequest.findMany({
            where: { customerId: userId },
            include: {
                auditor: { select: { name: true, email: true } },
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: requests });
    } catch (error) {
        console.error('Customer requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// PUT /api/customer/requests/:id - Update request status/reply
router.put('/requests/:id', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { status } = req.body; // Allow customer to mark as resolved or add comments (future)

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const request = await prisma.auditRequest.findFirst({
            where: { id, customerId: userId }
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const updatedRequest = await prisma.auditRequest.update({
            where: { id },
            data: { status }
        });

        res.json({ success: true, data: updatedRequest });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// POST /api/customer/issues - Report an issue
router.post('/issues', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const { projectId, title, description } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!projectId || !title || !description) {
            return res.status(400).json({ error: 'Project, title, and description are required' });
        }

        // Verify project ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, customerId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const issue = await prisma.projectIssue.create({
            data: {
                projectId,
                customerId: userId,
                title,
                description,
                status: 'open'
            }
        });

        res.status(201).json({ success: true, data: issue });
    } catch (error) {
        console.error('Report issue error:', error);
        res.status(500).json({ error: 'Failed to report issue' });
    }
});

export default router;
