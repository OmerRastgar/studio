
import { Router, Request, Response } from 'express';
import neo4j from 'neo4j-driver';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/jwt';
import { kratosAdmin } from '../lib/kratos';

const router = Router();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
// Handle NEO4J_AUTH=username/password format
let NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
let NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

if (process.env.NEO4J_AUTH) {
    const [auth_user, auth_pass] = process.env.NEO4J_AUTH.split('/');
    if (auth_user && auth_pass) {
        NEO4J_USER = auth_user;
        NEO4J_PASSWORD = auth_pass;
    }
}

const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    { disableLosslessIntegers: true }
);

// GET /api/compliance/projection
// Calculates potential compliance coverage across all standards based on user's uploaded evidence
router.get('/projection', authenticate, async (req: Request, res: Response) => {
    const session = driver.session();
    try {
        const userId = (req as AuthRequest).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get user email from Postgres (Neo4j uses email as identifier)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // 1. Run sophisticated cross-walk query
        // Matches: User -> Evidence -> Tag -> Control -> Standard
        // We start with Standards to ensure we always return a list, even if User has no data.
        const query = `
                MATCH (total_c:Control)-[:BELONGS_TO]->(s:Standard)
                WITH s, count(DISTINCT total_c) as total
                
                // Find controls covered by Evidence (using OPTIONAL MATCH to preserve standards with 0 coverage)
                OPTIONAL MATCH (s)<-[:BELONGS_TO]-(c:Control)-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(e:Evidence)
                WHERE ( (:User {email: $userEmail})-[:UPLOADED]->(e) )
                   OR ( e.projectId = 'demo-project-master-id' AND $userEmail IN ['manager@example.com', 'auditor@example.com', 'reviewer@example.com'] )
                
                // Aggregate
                
                // Aggregate
                RETURN s.id as id, s.name as name, count(DISTINCT c) as covered, total
                ORDER BY covered DESC
            `;

        console.log(`[Compliance] Running projection query for user: ${userId} (${user.email})`);
        const result = await session.run(query, { userEmail: user.email });
        console.log(`[Compliance] Query returned ${result.records.length} records`);

        // 2. Get existing Active projects for this user to check for duplicates
        const existingProjects = await prisma.project.findMany({
            where: {
                customerId: userId,
                status: { not: 'rejected' }
            },
            select: {
                id: true,
                frameworkId: true,
                status: true
            }
        });

        // Create a lookup map
        const projectMap = new Map();
        existingProjects.forEach(p => {
            if (p.frameworkId) projectMap.set(p.frameworkId, { id: p.id, status: p.status });
        });

        const projection = result.records.map(r => {
            const covered = Number(r.get('covered'));
            const total = Number(r.get('total'));
            const frameworkId = r.get('id');
            const existing = projectMap.get(frameworkId);

            return {
                id: frameworkId,
                name: r.get('name'),
                covered,
                total,
                percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
                hasProject: !!existing,
                projectId: existing?.id || null,
                projectStatus: existing?.status || null
            };
        });

        console.log(`[PROJECTION_DEBUG] User: ${(req as any).user?.userId || 'undefined'}, Payload: ${JSON.stringify(projection)}`);
        res.json({ success: true, data: projection });

    } catch (error) {
        console.error('Compliance projection CRITICAL error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        res.status(500).json({ error: 'Failed to calculate compliance projection' });
    } finally {
        await session.close();
    }
    // ... projection endpoint ...
});

// GET /api/compliance/users
// Fetch all compliance users created by the current customer
// GET /api/compliance/users
// Fetch all compliance users created by the current customer
// GET /api/compliance/users
// Fetch all compliance users created by the current customer
router.get('/users', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const users = await prisma.user.findMany({
            where: {
                linkedCustomerId: userId,
                role: 'compliance'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                lastActive: true,
                createdAt: true,
                sharedProjects: {
                    include: {
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        res.json(users);
    } catch (error) {
        console.error('List compliance users error:', error);
        res.status(500).json({ error: 'Failed to fetch compliance users' });
    }
});

// GET /api/compliance/dashboard
// Fetch dashboard data for a compliance user (shared projects)
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Fetch projects shared with this user
        const sharedData = await prisma.projectShare.findMany({
            where: { userId },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        description: true,
                        startDate: true,
                        dueDate: true,
                        framework: {
                            select: {
                                name: true
                            }
                        },
                        projectControls: {
                            select: {
                                progress: true
                            }
                        }
                    }
                }
            }
        });

        const projects = sharedData.map(s => {
            const p = s.project;
            // Calculate average progress
            const totalControls = p.projectControls.length;
            const totalProgress = p.projectControls.reduce((sum, c) => sum + c.progress, 0);
            const avgProgress = totalControls > 0 ? Math.round(totalProgress / totalControls) : 0;

            return {
                id: p.id,
                name: p.name,
                frameworkName: p.framework?.name || 'Custom',
                status: p.status,
                progress: avgProgress,
                startDate: p.startDate,
                dueDate: p.dueDate
            };
        });

        const stats = {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'in_progress' || p.status === 'pending').length,
            completedProjects: projects.filter(p => p.status === 'completed').length,
            avgCompliance: projects.length > 0 ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length) : 0
        };

        res.json({ stats, projects });

    } catch (error) {
        console.error('Compliance dashboard error:', error);
        res.status(500).json({ error: 'Failed to load compliance dashboard' });
    }
});

// GET /api/compliance/projects/:id
// Fetch single project details if shared
router.get('/projects/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        const projectId = req.params.id;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Check access
        const share = await prisma.projectShare.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId
                }
            }
        });

        if (!share) {
            return res.status(404).json({ error: 'Project not found or not shared' });
        }

        // Fetch details matching customer dashboard structure
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                },
                projectControls: {
                    include: {
                        control: {
                            include: { tags: true }
                        },
                        evidence: {
                            include: {
                                tags: true,
                                uploadedBy: { select: { id: true, name: true } }
                            }
                        },
                        _count: {
                            select: { evidence: true }
                        }
                    }
                }
            }
        });

        if (!project) return res.status(404).json({ error: 'Project not found' });

        // Group controls by category (Transformation Logic)
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
                evidence: pc.evidence.map((e: any) => ({
                    ...e,
                    tags: e.tags.map((t: any) => t.name)
                })),
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
                status: project.status,
                framework: project.framework,
                auditor: project.auditor,
                startDate: project.startDate,
                dueDate: project.dueDate,
                endDate: project.endDate,
                categories,
            }
        });

    } catch (error) {
        console.error('Compliance project details error:', error);
        res.status(500).json({ error: 'Failed to fetch project details' });
    }
});

// POST /api/compliance/users
// Create a new compliance user
router.post('/users', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = (req as AuthRequest).user?.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // 1. Create Identity in Kratos
        console.log(`[Compliance] Creating Kratos identity for ${email}`);
        const { data: identity } = await kratosAdmin.createIdentity({
            createIdentityBody: {
                schema_id: "default",
                traits: {
                    email: email.toLowerCase(),
                    name: name, // Schema expects a string, not an object
                    role: "compliance",
                },
                metadata_public: {
                    role: "compliance",
                    linked_customer_id: userId
                },
                credentials: {
                    password: { config: { password: password } }
                },
                state: "active"
            }
        });

        console.log(`[Compliance] Kratos Identity created: ${identity.id}`);

        // 2. Create in Prisma, ensuring IDs match
        const newUser = await prisma.user.create({
            data: {
                id: identity.id, // Sychronize ID with Kratos
                name,
                email: email.toLowerCase(),
                password: "managed-by-kratos", // Password is managed by Kratos
                role: 'compliance',
                status: 'Active',
                linkedCustomerId: userId,
                avatarUrl: `https://picsum.photos/seed/${email}/100/100`
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        });

        res.status(201).json(newUser);
    } catch (error: any) {
        console.error('Create compliance user error:', error?.response?.data || error);
        res.status(500).json({ error: 'Failed to create compliance user. ' + (error?.response?.data?.error?.message || error.message) });
    }
});

// POST /api/compliance/share
// Share a project with a compliance user
router.post('/share', authenticate, async (req: Request, res: Response) => {
    try {
        const authUserId = (req as AuthRequest).user?.userId;
        if (!authUserId) return res.status(401).json({ error: 'Unauthorized' });

        const { projectId, userId, action } = req.body;

        if (!projectId || !userId) {
            return res.status(400).json({ error: 'Project ID and Target User ID are required' });
        }

        if (action === 'unshare') {
            await prisma.projectShare.deleteMany({
                where: {
                    projectId,
                    userId
                }
            });
            return res.json({ success: true, message: 'Project unshared successfully' });
        } else {
            const share = await prisma.projectShare.upsert({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                update: {},
                create: {
                    projectId,
                    userId
                }
            });
            return res.status(201).json(share);
        }

    } catch (error) {
        console.error('Share project error:', error);
        res.status(500).json({ error: 'Failed to share project' });
    }
});

export default router;
