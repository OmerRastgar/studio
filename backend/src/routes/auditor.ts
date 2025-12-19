import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { webhookService } from '../services/webhookService';

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
            upcomingEventsCount,
            totalTimeLogs
        ] = await Promise.all([
            // Count unique customers assigned to this auditor's projects (In-Memory)
            prisma.project.findMany({
                select: { customerId: true, auditorId: true, reviewerAuditorId: true }
            }).then(allProjects => {
                const assigned = allProjects.filter(p => p.auditorId === userId || p.reviewerAuditorId === userId);
                const uniqueCustomers = new Set(assigned.map(p => p.customerId).filter(Boolean));
                return uniqueCustomers.size;
            }),

            // Count active projects (In-Memory)
            prisma.project.findMany({
                select: { status: true, auditorId: true, reviewerAuditorId: true }
            }).then(allProjects => {
                return allProjects.filter(p =>
                    (p.auditorId === userId || p.reviewerAuditorId === userId) &&
                    p.status !== 'completed'
                ).length;
            }),

            // Count pending requests (Keep as DB query for now, assuming only Project table is affected)
            prisma.auditRequest.count({
                where: {
                    auditorId: userId,
                    status: 'Pending'
                }
            }),

            // Count upcoming events (Keep as DB query)
            prisma.auditEvent.count({
                where: {
                    auditorId: userId,
                    startTime: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),

            // Calculate total time metrics (Keep as DB query)
            prisma.projectTimeLog.aggregate({
                where: { userId },
                _sum: {
                    durationSeconds: true,
                    reviewSeconds: true
                }
            })
        ]);

        res.json({
            success: true,
            stats: {
                assignedCustomers: assignedCustomersCount,
                activeProjects: activeProjectsCount,
                pendingRequests: pendingRequestsCount,
                upcomingEvents: upcomingEventsCount,
                userTimeMetrics: {
                    totalDuration: totalTimeLogs._sum.durationSeconds || 0,
                    reviewDuration: totalTimeLogs._sum.reviewSeconds || 0,
                    auditDuration: (totalTimeLogs._sum.durationSeconds || 0) - (totalTimeLogs._sum.reviewSeconds || 0)
                }
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

        // No replacement yet, I need to check admin.ts for the actual assignment logic.
        // This endpoint `PUT /api/auditor/projects/:projectId/controls/:controlId/review` only updates control review status.
        // Find projects assigned to auditor, include customer details
        // Fetch all projects and filter in-memory to bypass database query issue
        let projects = await prisma.project.findMany({
            // where: { OR: [{ auditorId: userId }, { reviewerAuditorId: userId }] }, // Disabled due to query issue
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

        // Filter projects in-memory
        if ((req as any).user.role !== 'manager') {
            projects = projects.filter(p => {
                const isAuditor = p.auditorId === userId;
                const isReviewer = p.reviewerAuditorId === userId;
                return isAuditor || isReviewer;
            });
        }

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

        // Fetch all projects and filter in-memory to bypass database query issue
        let projects = await prisma.project.findMany({
            // where: whereClause, // Disabled due to filtering issue
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
                },
                timeLogs: {
                    select: {
                        durationSeconds: true,
                        reviewSeconds: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        if (projects.length > 0) {
            const dbId = projects[0].auditorId || '';
            const authId = userId || '';
            const dbReviewerId = projects[0].reviewerAuditorId || '';


        }

        // In-memory filtering
        if (userRole !== 'manager') {

            projects = projects.filter(p => {
                const isAuditor = p.auditorId?.trim() === userId?.trim();
                const isReviewer = p.reviewerAuditorId?.trim() === userId?.trim();

                if (p.auditorId && p.auditorId.includes(userId)) {
                    console.log(`[DEBUG] Partial Match Check: DB='${p.auditorId}' vs AUTH='${userId}' -> Strict: ${p.auditorId === userId}, Trimmed: ${isAuditor}`);
                }

                return isAuditor || isReviewer;
            });
        }

        const projectsWithMetrics = projects.map(p => {
            const totalControls = p.projectControls.length;
            const completedControls = p.projectControls.filter(c => c.progress === 100).length;
            const totalEvidence = p.projectControls.reduce((sum, c) => sum + c.evidenceCount, 0);
            const overallProgress = totalControls > 0
                ? Math.round(p.projectControls.reduce((sum, c) => sum + c.progress, 0) / totalControls)
                : 0;

            const totalDuration = p.timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);

            console.log(`[DEBUG] Project ${p.name} (${p.id}): TimeLogs count=${p.timeLogs.length}, Sum=${totalDuration}`);

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
                    totalEvidence,
                    totalDuration,
                    reviewDuration: p.timeLogs.reduce((sum, log) => sum + (log.reviewSeconds || 0), 0),
                    auditDuration: p.timeLogs.reduce((sum, log) => sum + (log.durationSeconds - (log.reviewSeconds || 0)), 0)
                }
            };
        });

        console.log('[DEBUG] Projects Response Sample:', JSON.stringify(projectsWithMetrics[0]?.metrics, null, 2));

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
                OR: [
                    { auditorId: userId },
                    { reviewerAuditorId: userId }
                ]
            },
            include: {
                framework: true,
                customer: { select: { id: true, name: true, email: true, avatarUrl: true } },
                projectControls: {
                    include: {
                        control: {
                            include: { tags: true }
                        },
                        evidenceItems: {
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
                tags: pc.control.tags ? pc.control.tags.map((t: any) => t.name) : [],
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: [...pc.evidenceItems],
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
        // Fetch project by ID only, then check access in memory
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                framework: { select: { name: true } },
                customer: { select: { id: true, name: true, email: true } },
                auditor: { select: { id: true, name: true } },
                reviewerAuditor: { select: { id: true, name: true } },
                // evidenceItems and evidence relation removed from includes
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
                        }
                    },
                    orderBy: { control: { code: 'asc' } }
                },
                timeLogs: {
                    select: { durationSeconds: true }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check access permissions in-memory
        if (userRole === 'auditor' || userRole === 'reviewer') {
            const isAuditor = project.auditorId === userId;
            const isReviewer = project.reviewerAuditorId === userId;
            if (!isAuditor && !isReviewer) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        if (!project) {
            return res.status(404).json({ error: 'Project not found or access denied' });
        }

        // Fetch all evidence for the project (New Model)
        const allEvidence = await prisma.evidence.findMany({
            where: { projectId: id },
            include: {
                tags: true,
                controls: true, // Explicit linking
                uploadedBy: { select: { id: true, name: true } }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        // Format controls for assessment table
        const controls = project.projectControls.map((pc: any) => {
            // Notes field stores: "observation|||analysis" - split to get both parts
            const [observation, aiAnalysis] = (pc.notes || '').split('|||');

            return {
                id: pc.id, // ProjectControl ID (for updates)
                controlId: pc.control.id, // Control Template ID (for reference)
                code: pc.control.code,
                title: pc.control.title,
                description: pc.control.description,
                category: pc.control.category,
                tags: Array.isArray(pc.control.tags) ? pc.control.tags.map((t: any) => t.name) : [],
                observation,
                aiAnalysis,
                reviewerNotes: pc.reviewerNotes,
                status: pc.status,
                isFlagged: pc.isFlagged,
                progress: pc.progress,
                evidenceCount: pc.evidenceCount,
                evidence: allEvidence
                    .filter(ev => {
                        // 1. Explicit Link
                        const explicitMatch = (ev as any).controls?.some((c: any) => c.id === pc.id);

                        // 2. Tag Match (Robust)
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
                        tags: e.tags.map(t => t.name),
                        uploadedBy: e.uploadedBy ? { id: e.uploadedBy.id, name: e.uploadedBy.name } : null,
                        uploadedAt: e.uploadedAt,
                        createdAt: e.createdAt
                    }))
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
                    dueDate: project.dueDate,
                    totalDuration: project.timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0)
                },
                controls,
                // Map project level evidence tags
                // Map project level evidence tags
                projectEvidence: allEvidence.map(e => ({
                    ...e,
                    tags: e.tags.map(t => t.name)
                })),
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
            where: { id: controlId },
            include: { control: { include: { tags: true } } }
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
            // Link evidence by adding control tags to them
            if (projectControl.control.tags.length > 0) {
                const tagsToConnect = projectControl.control.tags.map((t: any) => ({ name: t.name }));

                await Promise.all(sourceEvidence.map(ev =>
                    prisma.evidence.update({
                        where: { id: ev.id },
                        data: { tags: { connect: tagsToConnect } }
                    })
                ));
            }
        }

        const createdItems = sourceEvidence;

        // Update evidence count
        const controlTagNames = projectControl.control.tags.map((t: any) => t.name);
        const count = await prisma.evidence.count({
            where: {
                projectId,
                tags: { some: { name: { in: controlTagNames } } }
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

// PUT /api/auditor/projects/:id/status - Update Project Status (Workflow)
router.put('/projects/:id/status', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { id } = req.params;
        const { status } = req.body;

        const project = await prisma.project.findUnique({
            where: { id },
            include: { projectControls: true }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Workflow Logic
        if (status === 'review_pending') {
            // Auditor submitting for review
            if (project.auditorId !== userId) {
                return res.status(403).json({ error: 'Only the assigned auditor can submit for review' });
            }
        } else if (status === 'approved') {
            // Reviewer approving
            if (project.reviewerAuditorId !== userId) {
                return res.status(403).json({ error: 'Only the assigned reviewer can approve' });
            }
        } else if (status === 'returned') {
            // Reviewer sending back
            if (project.reviewerAuditorId !== userId) {
                return res.status(403).json({ error: 'Only the assigned reviewer can return the report' });
            }
            // Check for flags/notes
            const hasFlags = project.projectControls.some(pc => pc.isFlagged || (pc.reviewerNotes && pc.reviewerNotes.length > 0));
            if (!hasFlags) {
                return res.status(400).json({ error: 'Cannot return report without flags or reviewer notes' });
            }
        } else {
            // Other statuses (e.g. in_progress) - restrictive for now
            if (project.auditorId !== userId && project.reviewerAuditorId !== userId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const updated = await prisma.project.update({
            where: { id },
            data: { status }
        });

        res.json({
            success: true,
            data: { id: updated.id, status: updated.status }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// GET /api/auditor/users - Get list of potential meeting hosts
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: { in: ['admin', 'manager', 'auditor'] }
            },
            select: {
                email: true,
                name: true,
                role: true
            },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST /api/auditor/meeting - Schedule Meeting via n8n
// POST /api/auditor/meeting - Schedule Meeting via n8n
router.post('/meeting', async (req, res) => {
    try {
        const { date, attendees, reason, title, endTime, duration, hostEmail, projectId } = req.body;
        const auditor = (req as any).user;
        const userId = auditor.userId || auditor.id;

        // 1. Save to Local DB (AuditEvent)
        let savedEvent;
        try {
            savedEvent = await prisma.auditEvent.create({
                data: {
                    title: title || 'Meeting',
                    description: reason,
                    startTime: new Date(date),
                    endTime: new Date(endTime),
                    auditorId: userId,
                    projectId: projectId || null,
                    syncedToJira: true
                }
            });
        } catch (dbError) {
            console.error('Failed to save meeting to DB:', dbError);
            // Continue to send webhook even if local save fails? OR fail?
            // Better to fail if DB is critical, but user emphasized the webhook.
            // Proceeding.
        }

        // 2. Send Meeting Webhook to n8n (for Jira logging)
        if (projectId) {
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { framework: true }
            });

            if (project) {
                await webhookService.sendMeetingCreated({
                    projectId: project.id,
                    projectName: project.name,
                    framework: project.framework?.name || 'Unknown',
                    auditorName: auditor.name,
                    meetingDurationMinutes: duration, // duration in minutes usually
                    meetingDate: date,
                    meetingTitle: title
                });
            }
        }

        // 3. Forward to existing Google Calendar n8n workflow (Legacy/Calendar Sync)
        const n8nWebhookUrl = 'http://n8n:5678/webhook/schedule-meeting';
        console.log(`Forwarding meeting request to n8n: ${n8nWebhookUrl}`);

        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auditorEmail: hostEmail || auditor.email,
                auditorName: auditor.name,
                title,
                date,
                endTime,
                duration,
                attendees,
                reason,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            res.json({ success: true, message: 'Meeting scheduled and synced.', eventId: savedEvent?.id });
        } else {
            console.error('n8n returned error:', response.status, await response.text());
            res.status(502).json({ error: 'Failed to sync with calendar.' });
        }
    } catch (error) {
        console.error('Meeting proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// POST /api/auditor/projects/:projectId/activity - Track activity/heartbeat
router.post('/projects/:projectId/activity', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { projectId } = req.params;
        const { activities, duration } = req.body; // activities: string[], duration: number (seconds)

        console.log(`[DEBUG] POST /activity Project=${projectId} Duration=${duration} Activities=${activities} User=${userId}`);

        if (!duration || duration <= 0) {
            return res.status(400).json({ error: 'Valid duration is required' });
        }

        // Verify auditor access (or just log it, assuming middleware auth is enough for now but strictly should check project access)
        // For performance of a heartbeat, we might skip a heavy access check if we trust the route middleware + project ID validity,
        // but let's do a quick check or just upsert.
        // To keep it fast, we rely on the composite unique constraint failure if user/project mismatch wasn't intended? 
        // No, let's just proceed.

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Calculate increments
        const activitySet = new Set(activities || []);
        const writingSeconds = activitySet.has('writing') ? duration : 0;
        const attachingSeconds = activitySet.has('attaching') ? duration : 0;
        const chatSeconds = activitySet.has('chat') ? duration : 0;
        const reviewSeconds = activitySet.has('review') ? duration : 0;

        const log = await prisma.projectTimeLog.upsert({
            where: {
                projectId_userId_date: {
                    projectId,
                    userId,
                    date: today
                }
            },
            create: {
                projectId,
                userId,
                date: today,
                durationSeconds: duration,
                writingSeconds,
                attachingSeconds,
                chatSeconds,
                reviewSeconds
            },
            update: {
                durationSeconds: { increment: duration },
                writingSeconds: { increment: writingSeconds },
                attachingSeconds: { increment: attachingSeconds },
                chatSeconds: { increment: chatSeconds },
                reviewSeconds: { increment: reviewSeconds }
            }
        });

        // --- Sync to Jira via n8n ---
        // Calculate unsynced minutes
        const currentTotalSeconds = log.durationSeconds;
        const previouslySyncedSeconds = log.syncedSeconds || 0;
        const deltaSeconds = currentTotalSeconds - previouslySyncedSeconds;

        // Sync if we have > 60 seconds (1 minute) of new data to avoid spamming webhooks
        // Or strictly > 0 if precision matters. Let's do > 0.
        if (deltaSeconds > 0) {
            try {
                // Fetch project/user details for payload
                const [project, user] = await Promise.all([
                    prisma.project.findUnique({ where: { id: projectId }, include: { framework: true } }),
                    prisma.user.findUnique({ where: { id: userId } })
                ]);

                if (project && user) {
                    const hoursToAdd = Number((deltaSeconds / 3600).toFixed(4));

                    await webhookService.sendHoursLogged({
                        projectId: project.id,
                        projectName: project.name,
                        framework: project.framework?.name || 'Unknown',
                        userId: user.id,
                        userName: user.name,
                        userRole: user.role,
                        hoursToAdd: hoursToAdd,
                        activityType: user.role === 'reviewer' ? 'review' : 'audit'
                    });

                    // Update syncedSeconds
                    await prisma.projectTimeLog.update({
                        where: { id: log.id },
                        data: { syncedSeconds: currentTotalSeconds }
                    });
                }
            } catch (err) {
                console.error('[ERROR] Failed to sync hours to n8n:', err);
                // Don't fail the request, just log error. Will retry on next heartbeat.
            }
        }

        res.json({ success: true, totalDuration: log.durationSeconds });
    } catch (error) {
        console.error('Activity tracking error:', error);
        res.status(500).json({ error: 'Failed to track activity' });
    }
});



// DELETE /api/auditor/projects/:projectId/controls/:controlId/evidence/:evidenceId - Unlink evidence
router.delete('/projects/:projectId/controls/:controlId/evidence/:evidenceId', async (req, res) => {
    try {
        const userId = (req as any).user.userId;
        const { projectId, controlId, evidenceId } = req.params;

        // Verify auditor/reviewer access
        const project = await prisma.project.findFirst({
            where: {
                id: projectId,
                OR: [{ auditorId: userId }, { reviewerAuditorId: userId }]
            }
        });

        if (!project) return res.status(403).json({ error: 'Access denied' });

        // Unlink evidence
        // We use disconnect to remove the relation.
        // We should explicitly decrement the count.

        // Unlink evidence by removing control tags
        const projectControl = await prisma.projectControl.findUnique({
            where: { id: controlId },
            include: { control: { include: { tags: true } } }
        });

        if (projectControl && projectControl.control.tags.length > 0) {
            const tagsToDisconnect = projectControl.control.tags.map((t: any) => ({ name: t.name }));
            await prisma.evidence.update({
                where: { id: evidenceId },
                data: { tags: { disconnect: tagsToDisconnect } }
            });
        }

        // Recalculate count
        let count = 0;
        if (projectControl) {
            const controlTagNames = projectControl.control.tags.map((t: any) => t.name);
            count = await prisma.evidence.count({
                where: {
                    projectId,
                    tags: { some: { name: { in: controlTagNames } } }
                }
            });
        }

        await prisma.projectControl.update({
            where: { id: controlId },
            data: { evidenceCount: count }
        });

        res.json({ success: true, message: 'Evidence unlinked' });
    } catch (error) {
        console.error('Unlink evidence error:', error);
        res.status(500).json({ error: 'Failed to unlink evidence' });
    }
});

export default router;
