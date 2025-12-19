import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { GraphService } from '../services/graph.service';
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
            (userRole === 'auditor' && (project.auditorId === userId || project.reviewerAuditorId === userId)) ||
            (userRole === 'reviewer' && (project.auditorId === userId || project.reviewerAuditorId === userId)) ||
            (userRole === 'customer' && project.customerId === userId) ||
            project.projectShares.some(share => share.userId === userId);

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this project' });
        }

        // Build query
        const where: any = { projectId };

        // If filtering by control, we must find evidence that shares tags with this control
        if (controlId && typeof controlId === 'string') {
            const control = await prisma.projectControl.findUnique({
                where: { id: controlId },
                include: { control: { include: { tags: true } } }
            });

            if (control && control.control.tags.length > 0) {
                const tagNames = control.control.tags.map(t => t.name);
                where.tags = {
                    some: {
                        name: { in: tagNames }
                    }
                };
            } else {
                // Control has no tags, so no evidence can match via tags.
                // Return empty unless looking for evidence with NO tags? 
                // Usually just return empty.
                return res.json([]);
            }
        }

        const evidence = await prisma.evidence.findMany({
            where,
            include: {
                tags: true,
                controls: { include: { control: true } }, // Include linked controls
                uploadedBy: { select: { id: true, name: true } },
                agent: { select: { id: true, name: true } }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        const formattedEvidence = evidence.map(e => ({
            ...e,
            tags: e.tags.map(t => t.name)
        }));

        return res.json(formattedEvidence);
    } catch (error) {
        console.error('Error fetching evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper to update evidence counts based on tag matching
async function updateEvidenceCounts(projectId: string, tagNames: string[], increment: boolean) {
    if (!tagNames || tagNames.length === 0) return;

    // Find all ProjectControls in this project that match ANY of the tags
    const matchingControls = await prisma.projectControl.findMany({
        where: {
            projectId,
            control: {
                tags: { some: { name: { in: tagNames } } }
            }
        },
        select: { id: true }
    });

    if (matchingControls.length > 0) {
        await prisma.projectControl.updateMany({
            where: {
                id: { in: matchingControls.map(c => c.id) }
            },
            data: {
                evidenceCount: { [increment ? 'increment' : 'decrement']: 1 }
            }
        });
    }
}

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
            return res.status(403).json({ error: 'Permission denied' });
        }

        // DEBUG: Check what IDs we got
        console.log('[DEBUG-EVIDENCE] Creating evidence:', {
            projectId,
            fileName,
            controlIdsReceived: controlIds
        });

        // 1. Tag Aggregation (User tags + Inherited Control tags)
        const finalTags = new Set<string>();

        // Add user provided tags
        if (Array.isArray(tags)) {
            tags.forEach((t: string) => finalTags.add(t));
        }

        // Inherit from controls if specified
        if (Array.isArray(controlIds) && controlIds.length > 0) {
            // Need to find the *Control* ID from the *ProjectControl* ID passed in?
            // Usually 'controlIds' in frontend might be ProjectControl IDs or Control IDs.
            // Assuming ProjectControl IDs given the context of a Project.
            const relatedControls = await prisma.projectControl.findMany({
                where: { id: { in: controlIds }, projectId },
                include: { control: { include: { tags: true } } }
            });

            console.log('[DEBUG-EVIDENCE] Related ProjectControls found:', relatedControls.length);

            relatedControls.forEach(pc => {
                pc.control.tags.forEach(t => finalTags.add(t.name));
            });
        }

        // 2. Upsert Tags
        const tagConnect = [];
        for (const tagName of Array.from(finalTags)) {
            if (!tagName) continue;
            const t = await prisma.tag.upsert({
                where: { name: tagName },
                update: {},
                create: { name: tagName }
            });
            tagConnect.push({ id: t.id });
        }

        const controlConnect = controlIds?.map((id: string) => ({ id })) || [];
        console.log('[DEBUG-EVIDENCE] Connecting controls:', controlConnect);

        // 3. Create Evidence
        const evidence = await prisma.evidence.create({
            data: {
                projectId,
                fileName,
                fileUrl: fileUrl || null,
                type: type || 'document',
                uploadedById: userId,
                tags: {
                    connect: tagConnect
                },
                controls: {
                    connect: controlConnect
                }
            },
            include: {
                tags: true,
                controls: { include: { control: true } },
                uploadedBy: { select: { id: true, name: true } }
            }
        });

        // Emit Graph Events for Tags
        if (evidence && tagConnect.length > 0) {
            tagConnect.forEach(t => {
                GraphService.linkEvidenceToTag(evidence.id, t.id).catch(e => console.error(e));
            });
        }

        // 4. Update Evidence Counts (Auto-linking)
        await updateEvidenceCounts(projectId, Array.from(finalTags), true);

        return res.status(201).json({
            ...evidence,
            tags: evidence.tags.map(t => t.name)
        });
    } catch (error) {
        console.error('Error creating evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/evidence/:id
 * Update evidence metadata (tags)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { fileName, tags } = req.body; // controlIds ignored in update? User can update tags directly.
        const userId = req.user?.userId;
        const userRole = req.user?.role?.toLowerCase();

        const existing = await prisma.evidence.findUnique({
            where: { id },
            include: { project: true, tags: true }
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
            return res.status(403).json({ error: 'Permission denied' });
        }

        // 1. Handle Tags Change
        if (tags !== undefined && Array.isArray(tags)) {
            const oldTags = existing.tags.map(t => t.name);
            const newTags = tags; // Expecting string array of names

            // Decrement counts for old tags
            await updateEvidenceCounts(existing.projectId, oldTags, false);

            // Upsert new tags
            const tagConnect = [];
            for (const tagName of newTags) {
                if (!tagName) continue;
                const t = await prisma.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName }
                });
                tagConnect.push({ id: t.id });
            }

            // Update Evidence
            const updated = await prisma.evidence.update({
                where: { id },
                data: {
                    fileName: fileName !== undefined ? fileName : existing.fileName,
                    tags: {
                        set: tagConnect
                    }
                },
                include: { tags: true }
            });

            // Increment counts for new tags (this might double count if overlap? No, updateEvidenceCounts queries 'hasSome'.
            // Actually, if a PC matches both OLD and NEW, we decremented then incremented. Net 0. Correct.
            // If it matched OLD but not NEW, match removed -> Net -1. Correct.
            // If it matches NEW but not OLD, match added -> Net +1. Correct.
            await updateEvidenceCounts(existing.projectId, newTags, true);

            return res.json({
                ...updated,
                tags: updated.tags.map(t => t.name)
            });
        } else {
            // Only filename update
            const updated = await prisma.evidence.update({
                where: { id },
                data: {
                    fileName: fileName !== undefined ? fileName : existing.fileName
                },
                include: { tags: true }
            });
            return res.json({
                ...updated,
                tags: updated.tags.map(t => t.name)
            });
        }

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
            include: { project: true, tags: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Evidence not found' });
        }

        // DEBUG: Check permissions details BEFORE decision
        console.log('[DEBUG-EVIDENCE-DELETE] Check:', {
            evidenceId: id,
            userRole,
            userId,
            uploadedBy: existing.uploadedById,
            projectOwner: existing.project.customerId,
            projectAuditor: existing.project.auditorId
        });

        const canDelete =
            userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'auditor' && (existing.project.auditorId === userId || existing.uploadedById === userId)) ||
            (userRole === 'customer' && existing.uploadedById === userId); // Strict Uploader check for Customer

        // Status Check: Prevent deletion if Status is "review_pending" or "completed" or "approved" (unless Admin/Manager)
        console.log('[DEBUG-EVIDENCE-DELETE] Check Passed, validating Status...');
        if (canDelete && (userRole !== 'admin' && userRole !== 'manager')) {
            try {
                const status = existing.project.status;
                console.log('[DEBUG-EVIDENCE-DELETE] Project Status:', status);
                if (status === 'review_pending' || status === 'completed' || status === 'approved') {
                    console.log('[DEBUG-EVIDENCE-DELETE] Status Locked');
                    return res.status(403).json({ error: `Cannot delete evidence because project is in '${status}' status.` });
                }
            } catch (e) {
                console.error('[DEBUG-EVIDENCE-DELETE] Error reading status:', e);
            }
        }

        if (!canDelete) {
            console.log('[DEBUG-EVIDENCE-DELETE] Permission denied logic reached');
            // ... (keep existing logs logic in mind, but we just pass through because I cannot match large block easily)
            if (userRole === 'customer' && existing.uploadedById !== userId) {
                return res.status(403).json({ error: 'You can only delete evidence you have uploaded.' });
            }

            return res.status(403).json({
                error: 'Permission denied',
                debug: {
                    userRole,
                    userId,
                    uploadedBy: existing.uploadedById
                }
            });
        }

        if (canDelete) {
            console.log('[DEBUG-EVIDENCE-DELETE] Proceeding to delete updateEvidenceCounts...');
            // Decrement control counts (by tags)
            const tagNames = existing.tags.map(t => t.name);
            console.log('[DEBUG-EVIDENCE-DELETE] Tags to update:', tagNames);

            await updateEvidenceCounts(existing.projectId, tagNames, false);

            console.log('[DEBUG-EVIDENCE-DELETE] Performing DB Delete...');
            await prisma.evidence.delete({ where: { id } });
            console.log('[DEBUG-EVIDENCE-DELETE] Done.');
        }

        return res.json({ message: 'Evidence deleted successfully' });
    } catch (error) {
        console.error('Error deleting evidence:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
