import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/evidence
 * List evidence for a project (optionally filtered by control)
 * Query params: projectId (required), controlId (optional)
 */
router.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, controlId } = req.query;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toLowerCase();

        if (!projectId || typeof projectId !== 'string') {
            return res.status(400).json({ error: 'projectId is required' });
        }

        // Check project access based on role
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { projectShares: true }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Access control
        const hasAccess =
            userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'auditor' && project.auditorId === userId) ||
            (userRole === 'customer' && project.customerId === userId) ||
            project.projectShares.some(share => share.userId === userId);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this project' });
        }

        // Build query
        const where: any = { projectId };
        if (controlId && typeof controlId === 'string') {
            where.controls = { some: { id: controlId } };
        }

        const evidence = await prisma.evidence.findMany({
            where,
            include: {
                controls: {
                    select: {
                        id: true,
                        control: { select: { code: true, title: true } }
                    }
                },
                uploadedBy: { select: { id: true, name: true } },
                agent: { select: { id: true, name: true } }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        return res.json(evidence);
    } catch (error) {
        console.error('Error fetching evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/evidence
 * Upload new evidence
 */
router.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, controlIds, fileName, fileUrl, tags, type } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toLowerCase();

        if (!projectId || !fileName) {
            return res.status(400).json({ error: 'projectId and fileName are required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Check project access
        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Only customer (owner), auditor (assigned), admin, manager can upload
        const canUpload =
            userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'auditor' && project.auditorId === userId) ||
            (userRole === 'customer' && project.customerId === userId);

        if (!canUpload) {
            return res.status(403).json({ error: 'You do not have permission to upload evidence for this project' });
        }

        // Prepare connect operations for controls
        const controlsConnect = Array.isArray(controlIds) && controlIds.length > 0
            ? controlIds.map((id: string) => ({ id }))
            : [];

        const evidence = await prisma.evidence.create({
            data: {
                projectId,
                fileName,
                fileUrl: fileUrl || null,
                tags: tags || [],
                type: type || 'document',
                uploadedById: userId,
                controls: {
                    connect: controlsConnect
                }
            },
            include: {
                controls: {
                    select: {
                        id: true,
                        control: { select: { code: true, title: true } }
                    }
                },
                uploadedBy: { select: { id: true, name: true } }
            }
        });

        // Update evidence count on linked controls
        if (controlsConnect.length > 0) {
            await Promise.all(controlsConnect.map((c: any) =>
                prisma.projectControl.update({
                    where: { id: c.id },
                    data: { evidenceCount: { increment: 1 } }
                })
            ));
        }

        return res.status(201).json(evidence);
    } catch (error) {
        console.error('Error creating evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/evidence/:id
 * Update evidence metadata (tags, control assignment)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { fileName, controlIds, tags } = req.body;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toLowerCase();

        const existing = await prisma.evidence.findUnique({
            where: { id },
            include: { project: true, controls: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Evidence not found' });
        }

        // Check permission
        const canEdit =
            userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'auditor' && existing.project.auditorId === userId) ||
            (userRole === 'customer' && existing.uploadedById === userId);

        if (!canEdit) {
            return res.status(403).json({ error: 'You do not have permission to edit this evidence' });
        }

        // Handle control changes if controlIds provided
        let controlsUpdate = {};
        if (Array.isArray(controlIds)) {
            const oldControlIds = existing.controls.map(c => c.id);
            // Decrement removed
            const removed = oldControlIds.filter(id => !controlIds.includes(id));
            await Promise.all(removed.map(rid =>
                prisma.projectControl.update({ where: { id: rid }, data: { evidenceCount: { decrement: 1 } } })
            ));

            // Increment added
            const added = controlIds.filter((id: string) => !oldControlIds.includes(id));
            await Promise.all(added.map(aid =>
                prisma.projectControl.update({ where: { id: aid }, data: { evidenceCount: { increment: 1 } } })
            ));

            controlsUpdate = {
                set: controlIds.map((id: string) => ({ id }))
            };
        }

        const updated = await prisma.evidence.update({
            where: { id },
            data: {
                fileName: fileName !== undefined ? fileName : existing.fileName,
                tags: tags !== undefined ? tags : existing.tags,
                controls: controlsUpdate
            },
            include: {
                controls: {
                    select: {
                        id: true,
                        control: { select: { code: true, title: true } }
                    }
                },
                uploadedBy: { select: { id: true, name: true } }
            }
        });

        return res.json(updated);
    } catch (error) {
        console.error('Error updating evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/evidence/:id
 * Remove evidence
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toLowerCase();

        const existing = await prisma.evidence.findUnique({
            where: { id },
            include: { project: true, controls: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Evidence not found' });
        }

        // Check permission
        const canDelete =
            userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'auditor' && existing.project.auditorId === userId) ||
            (userRole === 'customer' && existing.uploadedById === userId);

        if (!canDelete) {
            return res.status(403).json({ error: 'You do not have permission to delete this evidence' });
        }

        // Decrement control counts
        if (existing.controls.length > 0) {
            await Promise.all(existing.controls.map(c =>
                prisma.projectControl.update({
                    where: { id: c.id },
                    data: { evidenceCount: { decrement: 1 } }
                })
            ));
        }

        await prisma.evidence.delete({ where: { id } });

        return res.json({ message: 'Evidence deleted successfully' });
    } catch (error) {
        console.error('Error deleting evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
