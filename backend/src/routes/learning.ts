import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/learning/policies
// Fetch all evidence items for the user's projects tagged as "Policy"
router.get('/policies', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const userRole = (req as AuthRequest).user?.role;
        console.log(`[Policies] Fetching for User: ${userId}, Role: ${userRole}`);

        // Get all projects for this user
        const projects = await prisma.project.findMany({
            where: { customerId: userId },
            select: { id: true, name: true }
        });
        const projectIds = projects.map(p => p.id);
        console.log(`[Policies] Found ${projectIds.length} projects for user:`, projects.map(p => p.name));

        if (projectIds.length === 0) {
            console.log('[Policies] No projects found for user, returning empty list');
            return res.json({ success: true, data: [] });
        }

        // Find evidence in these projects that have the tag "Policy"
        // Using the new Evidence model with Tag relation
        const policies = await prisma.evidence.findMany({
            where: {
                projectId: { in: projectIds },
                tags: {
                    some: {
                        name: { in: ['Policy', 'policy', 'POLICY', 'Policy Document', 'Policy document'] }
                    }
                }
            },
            include: {
                uploadedBy: {
                    select: { name: true }
                },
                project: {
                    select: { name: true }
                },
                policyReviews: {
                    where: { userId: userId },
                    select: { reviewedAt: true }
                }
            },
            orderBy: { uploadedAt: 'desc' }
        });

        console.log(`[Policies] Found ${policies.length} evidence items with policy tags.`);

        // Format response
        const formatted = policies.map(p => {
            // Extract ObjectKey from fileUrl: "/api/uploads/download/PROJECTID/UUID.EXT" -> "PROJECTID/UUID.EXT"
            let objectKey = '';
            if (p.fileUrl) {
                const parts = p.fileUrl.split('/api/uploads/download/');
                if (parts.length > 1) {
                    objectKey = parts[1];
                } else {
                    // Fallback: if fileUrl doesn't have the proxy prefix, use it as-is (direct MinIO key)
                    objectKey = p.fileUrl;
                }
            }

            return {
                id: p.id,
                fileName: p.fileName,
                fileUrl: p.fileUrl,
                objectKey,
                projectName: p.project.name,
                uploadedAt: p.uploadedAt,
                reviewed: p.policyReviews.length > 0,
                reviewedAt: p.policyReviews[0]?.reviewedAt || null
            };
        });

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Fetch policies error:', error);
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
});

// POST /api/learning/policies/:id/review
// Mark a policy as reviewed
router.post('/policies/:id/review', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const evidenceId = req.params.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await prisma.policyReview.create({
            data: {
                userId,
                evidenceId
            }
        });

        res.json({ success: true });
    } catch (error) {
        // Ignore duplicate key errors
        if ((error as any).code === 'P2002') {
            return res.json({ success: true });
        }
        console.error('Review policy error:', error);
        res.status(500).json({ error: 'Failed to review policy' });
    }
});

// DELETE /api/learning/policies/:id/review
// Un-mark a policy as reviewed
router.delete('/policies/:id/review', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const evidenceId = req.params.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        await prisma.policyReview.deleteMany({
            where: {
                userId,
                evidenceId
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Unreview policy error:', error);
        res.status(500).json({ error: 'Failed to unreview policy' });
    }
});

// GET /api/learning/training
// Return list of training videos
router.get('/training', authenticate, async (req: Request, res: Response) => {
    // Analytics-based suggestions (Mocked for now with provided list)
    const videos = [
        {
            id: '0Wd3JoUHXno',
            title: 'Suggested: Security Awareness',
            description: 'Learn how to identify and prevent social engineering attacks in your organization.',
            url: 'https://www.youtube.com/embed/0Wd3JoUHXno',
            thumbnail: 'https://img.youtube.com/vi/0Wd3JoUHXno/hqdefault.jpg'
        },
        {
            id: 'hsNRrEnB_aM',
            title: 'Suggested: Cybersecurity Habits',
            description: 'Essential cybersecurity habits for every employee.',
            url: 'https://www.youtube.com/embed/hsNRrEnB_aM',
            thumbnail: 'https://img.youtube.com/vi/hsNRrEnB_aM/hqdefault.jpg'
        },
        {
            id: 'QiaIL-J9Vds',
            title: 'Suggested: Phishing Deep Dive',
            description: 'Deep dive into phishing techniques and indicators.',
            url: 'https://www.youtube.com/embed/QiaIL-J9Vds',
            thumbnail: 'https://img.youtube.com/vi/QiaIL-J9Vds/hqdefault.jpg'
        },
        {
            id: 'D_yAYhjNE-0',
            title: 'Suggested: Password Mastery',
            description: 'Creating and managing strong, secure passwords.',
            url: 'https://www.youtube.com/embed/D_yAYhjNE-0',
            thumbnail: 'https://img.youtube.com/vi/D_yAYhjNE-0/hqdefault.jpg'
        },
        {
            id: 'FRxrHduwPjY',
            title: 'Suggested: Data Protection',
            description: 'Understanding data classification and handling procedures.',
            url: 'https://www.youtube.com/embed/FRxrHduwPjY',
            thumbnail: 'https://img.youtube.com/vi/FRxrHduwPjY/hqdefault.jpg'
        },
        {
            id: 'Hc01oZPvByg',
            title: 'Suggested: Mobile Security',
            description: 'Securing your mobile devices for remote work.',
            url: 'https://www.youtube.com/embed/Hc01oZPvByg',
            thumbnail: 'https://img.youtube.com/vi/Hc01oZPvByg/hqdefault.jpg'
        },
        {
            id: '7Apu1EWZPhQ',
            title: 'Suggested: Incident Response',
            description: 'What to do when you suspect a security breach.',
            url: 'https://www.youtube.com/embed/7Apu1EWZPhQ',
            thumbnail: 'https://img.youtube.com/vi/7Apu1EWZPhQ/hqdefault.jpg'
        },
        {
            id: 'RQttayB5ymA',
            title: 'Suggested: Cloud Security',
            description: 'Staying secure while using cloud services and shared storage.',
            url: 'https://www.youtube.com/embed/RQttayB5ymA',
            thumbnail: 'https://img.youtube.com/vi/RQttayB5ymA/hqdefault.jpg'
        },
        {
            id: 'JpfEBQn2CjM',
            title: 'Suggested: Compliance Standards',
            description: 'The importance of compliance standards in the workplace.',
            url: 'https://www.youtube.com/embed/JpfEBQn2CjM',
            thumbnail: 'https://img.youtube.com/vi/JpfEBQn2CjM/hqdefault.jpg'
        }
    ];

    res.json({ success: true, data: videos });
});

export default router;
