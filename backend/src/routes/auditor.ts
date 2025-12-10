import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();

// Apply authentication and auditor role check
router.use(authenticate);
router.use(requireRole(['auditor', 'manager', 'reviewer'])); // Managers can view for oversight (view-only mode)

// GET /api/auditor/dashboard - Dashboard Stats
router.get('/dashboard', async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        const [
            assignedCustomersCount,
            activeProjectsCount,
            pendingRequestsCount,
            upcomingEventsCount
        ] = await Promise.all([
            // Count unique customers assigned to this auditor's projects
            prisma.project.findMany({
                where: { auditorId: userId },
                select: { customerId: true },
                distinct: ['customerId']
            }).then(projects => projects.length),

            // Count active projects
            prisma.project.count({
                where: {
                    auditorId: userId,
                    status: { not: 'completed' }
                }
            }),

            // Count pending requests
            prisma.auditRequest.count({
                where: {
                    auditorId: userId,
                    status: 'Pending'
                }
            }),

            // Count upcoming events (next 7 days)
            prisma.auditEvent.count({
                where: {
                    auditorId: userId,
                    startTime: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);

        res.json({
            success: true,
            stats: {
                assignedCustomers: assignedCustomersCount,
                activeProjects: activeProjectsCount,
                pendingRequests: pendingRequestsCount,
                upcomingEvents: upcomingEventsCount
            }
        });
    } catch (error) {
        console.error('Auditor dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// GET /api/auditor/customers - Assigned Customers
router.get('/customers', async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        // Find projects assigned to auditor, include customer details
        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { auditorId: userId },
                    { reviewerAuditorId: userId }
                ]
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
                        status: true
                    }
                }
            }
        });

        // Group by customer
        const customersMap = new Map();
        projects.forEach(project => {
            if (!project.customer) return;

            if (!customersMap.has(project.customer.id)) {
                customersMap.set(project.customer.id, {
                    ...project.customer,
                    projects: []
                });
            }

            customersMap.get(project.customer.id).projects.push({
                id: project.id,
                name: project.name,
                status: project.status,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate
            });
        });

        res.json({
            success: true,
            data: Array.from(customersMap.values())
        });
    } catch (error) {
        console.error('Auditor customers error:', error);
        res.status(500).json({ error: 'Failed to fetch assigned customers' });
    }
});

// GET /api/auditor/projects - Detailed Projects List
router.get('/projects', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        console.log('[DEBUG] GET /projects - UserID:', userId, 'Role:', userRole);

        const whereClause: any = {};
        if (userRole !== 'manager') {
            whereClause.OR = [
                { auditorId: userId },
                { reviewerAuditorId: userId }
            ];
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: { name: true, avatarUrl: true }
                },
                framework: {
                    select: { name: true }
                },
                projectControls: {
                    select: {
                        progress: true,
                        evidenceCount: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Calculate aggregate metrics
        const projectsWithMetrics = projects.map(p => {
            const totalControls = p.projectControls.length;
            const completedControls = p.projectControls.filter(c => c.progress === 100).length;
            const totalEvidence = p.projectControls.reduce((sum, c) => sum + c.evidenceCount, 0);
            const overallProgress = totalControls > 0
                ? Math.round(p.projectControls.reduce((sum, c) => sum + c.progress, 0) / totalControls)
                : 0;

            return {
                id: p.id,
                name: p.name,
                customerName: p.customer?.name || 'Unknown',
                customerAvatar: p.customer?.avatarUrl,
                frameworkName: p.framework?.name || 'Custom',
                status: p.status,
                startDate: p.startDate,
                dueDate: p.dueDate,
                endDate: p.endDate,
                role: p.reviewerAuditorId === userId ? 'reviewer' : 'auditor',
                metrics: {
                    progress: overallProgress,
                    completedControls,
                    totalControls,
                    totalEvidence
                }
            };
        });

        res.json({
            success: true,
            data: projectsWithMetrics
        });
    } catch (error) {
        console.error('Auditor projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// GET /api/auditor/projects/:id - Project details
router.get('/projects/:id', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;

        const project = await prisma.project.findFirst({
            where: {
                id,
                auditorId: userId
            },
            include: {
                framework: true,
                customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
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
            return res.status(404).json({ error: 'Project not found or access denied' });
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
                status: project.status,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                progress: overallProgress,
                categories
            }
        });
    } catch (error) {
        console.error('Auditor project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// GET /api/auditor/requests - Audit Requests
router.get('/requests', async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        const requests = await prisma.auditRequest.findMany({
            where: { auditorId: userId },
            include: {
                customer: { select: { name: true, avatarUrl: true } },
                project: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error('Auditor requests error:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// POST /api/auditor/requests - Create Request
router.post('/requests', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const body = req.body;
        console.log('[DEBUG] POST /requests', { userId, body });
        const { customerId, projectId, controlId, title, description, dueDate } = body;

        if (!customerId || !title) {
            return res.status(400).json({ error: 'Customer and title are required' });
        }

        const request = await prisma.auditRequest.create({
            data: {
                auditorId: userId,
                customerId,
                projectId,
                controlId,
                title,
                description,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'Pending'
            }
        });

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

// PUT /api/auditor/requests/:id - Update Request Status
router.put('/requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const request = await prisma.auditRequest.update({
            where: { id },
            data: { status }
        });

        res.json({
            success: true,
            data: request
        });
    } catch (error) {
        console.error('Update request error:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// GET /api/auditor/events - Calendar Events
router.get('/events', async (req, res) => {
    try {
        const userId = (req as any).user.userId;

        const [dbEvents, projects] = await Promise.all([
            prisma.auditEvent.findMany({
                where: { auditorId: userId },
                include: {
                    customer: { select: { name: true } },
                    project: { select: { name: true } }
                },
                orderBy: { startTime: 'asc' }
            }),
            prisma.project.findMany({
                where: {
                    auditorId: userId,
                    status: { not: 'completed' }
                },
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    dueDate: true,
                    customer: { select: { name: true } }
                }
            })
        ]);

        const events = [...dbEvents];

        // Add project milestones as events
        projects.forEach(p => {
            if (p.startDate) {
                events.push({
                    id: `start-${p.id}`,
                    title: `Project Start: ${p.name}`,
                    description: 'Project Start Date',
                    startTime: p.startDate,
                    endTime: p.startDate,
                    auditorId: userId,
                    customerId: null,
                    projectId: p.id,
                    customer: p.customer,
                    project: { name: p.name },
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
            if (p.dueDate) {
                events.push({
                    id: `due-${p.id}`,
                    title: `Project Due: ${p.name}`,
                    description: 'Project Due Date',
                    startTime: p.dueDate,
                    endTime: p.dueDate,
                    auditorId: userId,
                    customerId: null,
                    projectId: p.id,
                    customer: p.customer,
                    project: { name: p.name },
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
            }
        });

        res.json({
            success: true,
            data: events
        });
    } catch (error) {
        console.error('Auditor events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// POST /api/auditor/events - Create Calendar Event
router.post('/events', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { title, description, startTime, endTime, projectId } = req.body;

        if (!title || !startTime || !endTime) {
            return res.status(400).json({ error: 'Title, start time, and end time are required' });
        }

        const event = await prisma.auditEvent.create({
            data: {
                auditorId: userId,
                title,
                description,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                projectId: projectId || null
            },
            include: {
                project: { select: { name: true } },
                customer: { select: { name: true } }
            }
        });

        res.json({
            success: true,
            data: event
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// GET /api/auditor/projects/:id/assessment - Get controls for assessment view
router.get('/projects/:id/assessment', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const { id } = req.params;

        // Allow access for auditors (assigned), reviewers (assigned) and managers (view only)
        let whereClause: any = { id };
        if (userRole === 'auditor' || userRole === 'reviewer') {
            whereClause.OR = [
                { auditorId: userId },
                { reviewerAuditorId: userId }
            ];
        }
        // Managers can view all projects, admins are blocked at middleware level

        const project = await prisma.project.findFirst({
            where: whereClause,
            include: {
                framework: { select: { name: true } },
                customer: { select: { id: true, name: true, email: true } },
                auditor: { select: { id: true, name: true } },
                reviewerAuditor: { select: { id: true, name: true } },
                projectControls: {
                    include: {
                        control: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                description: true,
                                category: true,
                                tags: true
                            }
                        },
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
                },
                // Also include project-level evidence
                evidence: {
                    select: {
                        id: true,
                        fileName: true,
                        fileUrl: true,
                        type: true,
                        tags: true,
                        uploadedAt: true,
                        uploadedBy: { select: { id: true, name: true } }
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Format controls for assessment table
        const controls = project.projectControls.map((pc: any) => {
            // Notes field stores: "observation|||analysis" - split to get both parts
            const notesData = pc.notes || '';
            const [observation, aiAnalysis] = notesData.includes('|||')
                ? notesData.split('|||')
                : [notesData, ''];

            return {
                id: pc.id,
                controlId: pc.control.id, // Should match pc.id if ProjectControl is the main entity in the list
                code: pc.control.code,
                title: pc.control.title,
                description: pc.control.description,
                category: pc.control.category,
                tags: pc.control.tags,
                observation,
                aiAnalysis,
                reviewerNotes: pc.reviewerNotes,
                isFlagged: pc.isFlagged,
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: [
                    ...pc.evidenceItems.map((e: any) => ({
                        id: e.id,
                        fileName: e.fileName,
                        fileUrl: e.fileUrl,
                        tags: e.tags,
                        tagSource: e.tagSource || 'manual',
                        uploadedBy: e.uploadedBy ? { id: e.uploadedBy.id, name: e.uploadedBy.name } : null,
                        uploadedAt: e.uploadedAt,
                        createdAt: e.createdAt
                    })),
                    ...pc.projectEvidence.map((e: any) => ({
                        id: e.id,
                        fileName: e.fileName,
                        fileUrl: e.fileUrl,
                        tags: e.tags,
                        tagSource: 'manual',
                        uploadedBy: e.uploadedBy ? { id: e.uploadedBy.id, name: e.uploadedBy.name } : null,
                        uploadedAt: e.uploadedAt,
                        createdAt: e.createdAt
                    }))
                ]
            };
        });

        res.json({
            success: true,
            data: {
                project: {
                    id: project.id,
                    name: project.name,
                    framework: project.framework?.name || 'Custom',
                    customer: project.customer,
                    auditor: project.auditor,
                    reviewer: project.reviewerAuditor,
                    status: project.status,
                    dueDate: project.dueDate
                },
                controls,
                projectEvidence: project.evidence,
                isViewOnly: userRole === 'manager',
                isReviewer: project.reviewerAuditorId === userId
            }
        });
    } catch (error) {
        console.error('Assessment data error:', error);
        res.status(500).json({ error: 'Failed to fetch assessment data' });
    }
});

// PUT /api/auditor/projects/:projectId/controls/:controlId/observation - Auto-save observation
router.put('/projects/:projectId/controls/:controlId/observation', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const { projectId, controlId } = req.params;
        const { observation } = req.body;

        // Only auditors can save observations
        if (userRole === 'manager') {
            return res.status(403).json({ error: 'Managers have view-only access' });
        }

        // Verify auditor owns this project
        const project = await prisma.project.findFirst({
            where: { id: projectId, auditorId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Update the project control's notes (observations) preserving any existing AI analysis
        const current = await prisma.projectControl.findUnique({
            where: { id: controlId }
        });

        const existingAnalysis = current?.notes?.split('|||')[1] || '';
        const newNotes = existingAnalysis ? `${observation}|||${existingAnalysis}` : observation;

        const updated = await prisma.projectControl.update({
            where: { id: controlId },
            data: { notes: newNotes }
        });

        res.json({
            success: true,
            data: { id: updated.id, observation: updated.notes?.split('|||')[0] }
        });
    } catch (error) {
        console.error('Save observation error:', error);
        res.status(500).json({ error: 'Failed to save observation' });
    }
});

// PUT /api/auditor/projects/:projectId/controls/:controlId/analysis - Save AI analysis
router.put('/projects/:projectId/controls/:controlId/analysis', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const { projectId, controlId } = req.params;
        const { analysis } = req.body;

        // Only auditors can save analysis
        if (userRole === 'manager') {
            return res.status(403).json({ error: 'Managers have view-only access' });
        }

        // Verify auditor owns this project
        const project = await prisma.project.findFirst({
            where: { id: projectId, auditorId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // For now, store AI analysis in the notes field with a prefix
        // TODO: Add dedicated aiAnalysis field to schema
        const current = await prisma.projectControl.findUnique({
            where: { id: controlId }
        });

        // Store analysis - using notes field for now
        // Format: observation|||analysis (split by separator)
        const observation = current?.notes?.split('|||')[0] || '';
        const updated = await prisma.projectControl.update({
            where: { id: controlId },
            data: { notes: `${observation}|||${analysis}` }
        });

        res.json({
            success: true,
            data: { id: updated.id, analysis }
        });
    } catch (error) {
        console.error('Save analysis error:', error);
        res.status(500).json({ error: 'Failed to save analysis' });
    }
});

// PUT /api/auditor/projects/:projectId/controls/:controlId/progress - Save progress
router.put('/projects/:projectId/controls/:controlId/progress', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const { projectId, controlId } = req.params;
        const { progress } = req.body;

        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            return res.status(400).json({ error: 'Invalid progress value (0-100)' });
        }

        // Only auditors can save progress
        if (userRole === 'manager') {
            return res.status(403).json({ error: 'Managers have view-only access' });
        }

        // Verify auditor owns this project
        const project = await prisma.project.findFirst({
            where: { id: projectId, auditorId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const updated = await prisma.projectControl.update({
            where: { id: controlId },
            data: { progress }
        });

        res.json({
            success: true,
            data: { id: updated.id, progress: updated.progress }
        });
    } catch (error) {
        console.error('Save progress error:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

// PUT /api/auditor/projects/:projectId/controls/:controlId/review - Save reviewer notes/flags
router.put('/projects/:projectId/controls/:controlId/review', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { projectId, controlId } = req.params;
        const { reviewerNotes, isFlagged } = req.body;

        // Verify user is the assigned reviewer
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project || (project.reviewerAuditorId !== userId && project.auditorId !== userId)) {
            return res.status(403).json({ error: 'Access denied: You are not the reviewer or auditor for this project' });
        }

        const updateData: any = {
            isFlagged: isFlagged === true
        };
        if (reviewerNotes !== undefined) {
            updateData.reviewerNotes = reviewerNotes;
        }

        const updated = await prisma.projectControl.update({
            where: { id: controlId },
            data: updateData
        });

        res.json({
            success: true,
            data: {
                id: updated.id,
                reviewerNotes: updated.reviewerNotes,
                isFlagged: updated.isFlagged
            }
        });
    } catch (error) {
        console.error('Save review error:', error);
        res.status(500).json({ error: 'Failed to save review' });
    }
});

// POST /api/auditor/projects/:projectId/controls/:controlId/evidence/link - Link existing evidence
router.post('/projects/:projectId/controls/:controlId/evidence/link', async (req, res) => {
    try {
        const userId = (req as any).user?.userId;
        const userRole = (req as any).user?.role;

        if (!userId) {
            console.error('Link evidence: Missing userId in request');
            return res.status(401).json({ error: 'Unauthorized: No user ID' });
        }
        const { projectId, controlId } = req.params;
        const { evidenceIds } = req.body;

        if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
            return res.status(400).json({ error: 'No evidence IDs provided' });
        }

        // Only auditors can link evidence
        if (userRole === 'manager') {
            return res.status(403).json({ error: 'Managers have view-only access' });
        }

        // Verify auditor owns this project
        const project = await prisma.project.findFirst({
            where: { id: projectId, auditorId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        const projectControl = await prisma.projectControl.findUnique({
            where: { id: controlId }
        });

        if (!projectControl) {
            return res.status(404).json({ error: 'Control not found' });
        }

        // Fetch source evidence
        const sourceEvidence = await prisma.evidence.findMany({
            where: {
                id: { in: evidenceIds },
                projectId: projectId
            }
        });

        // Verify user exists to prevent P2003
        const uploaderJson = await prisma.user.findUnique({ where: { id: userId } });
        if (!uploaderJson) {
            console.error(`[ERROR] User ${userId} not found in DB. Cannot link evidence.`);
            return res.status(401).json({ error: 'User not found' });
        }

        console.log(`Linking evidence: User=${userId} (Found), Project=${projectId}, Control=${controlId}, Count=${sourceEvidence.length}`);

        // Create new Evidence linked to this ProjectControl (copying details)
        // REFACTOR: Use Many-to-Many connect instead of duplicating data
        // connect all evidence items in one go to avoid race conditions
        if (sourceEvidence.length > 0) {
            console.log(`[DEBUG] Connecting ${sourceEvidence.length} evidence items to control ${controlId}`);

            await prisma.projectControl.update({
                where: { id: controlId },
                data: {
                    projectEvidence: {
                        connect: sourceEvidence.map(ev => ({ id: ev.id }))
                    }
                }
            });
        }

        const createdItems = sourceEvidence; // They aren't newly created, but returning them satisfies the API interface

        // Update evidence count
        // Using projectEvidence relation which we just verified
        const count = await prisma.evidence.count({
            where: {
                controls: { some: { id: controlId } }
            }
        });

        await prisma.projectControl.update({
            where: { id: controlId },
            data: {
                evidenceCount: count
            }
        });

        res.json({
            success: true,
            data: createdItems
        });
    } catch (error) {
        console.error('Link evidence error:', error);
        res.status(500).json({ error: 'Failed to link evidence' });
    }
});

// GET /api/auditor/reviewers - Get available auditors who can be reviewers
router.get('/reviewers', async (req, res) => {
    try {
        const userId = (req as any).user.id;

        // Get all auditors except the current user
        const auditors = await prisma.user.findMany({
            where: {
                role: { in: ['auditor', 'reviewer'] },
                id: { not: userId },
                status: 'Active'
            },
            select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                role: true
            }
        });

        res.json({
            success: true,
            data: auditors
        });
    } catch (error) {
        console.error('Get reviewers error:', error);
        res.status(500).json({ error: 'Failed to fetch reviewers' });
    }
});

// PUT /api/auditor/projects/:id/reviewer - Assign reviewer to project
router.put('/projects/:id/reviewer', async (req, res) => {
    try {
        const userId = (req as any).user.id;
        const { id } = req.params;
        const { reviewerId } = req.body;

        // Verify auditor owns this project
        const project = await prisma.project.findFirst({
            where: { id, auditorId: userId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Update reviewer
        const updated = await prisma.project.update({
            where: { id },
            data: { reviewerAuditorId: reviewerId || null },
            include: {
                reviewerAuditor: { select: { id: true, name: true } }
            }
        });

        res.json({
            success: true,
            data: { reviewer: updated.reviewerAuditor }
        });
    } catch (error) {
        console.error('Assign reviewer error:', error);
        res.status(500).json({ error: 'Failed to assign reviewer' });
    }
});

export default router;
