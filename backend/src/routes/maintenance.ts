import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { kratosAdmin } from '../lib/kratos';

const router = Router();
const prisma = new PrismaClient();

const SEED_USERS = [
    { email: 'admin@example.com', password: 'password123', role: 'admin', name: 'Admin User' },
    { email: 'manager@example.com', password: 'password123', role: 'manager', name: 'Manager User' },
    { email: 'auditor@example.com', password: 'password123', role: 'auditor', name: 'Auditor User' },
    { email: 'customer@example.com', password: 'password123', role: 'customer', name: 'Customer User' },
    { email: 'manager1@example.com', password: 'password123', role: 'manager', name: 'Manager One' },
    { email: 'auditor1@example.com', password: 'password123', role: 'auditor', name: 'Auditor One' },
    { email: 'customer1@example.com', password: 'password123', role: 'customer', name: 'Customer One' },
    { email: 'manager2@example.com', password: 'password123', role: 'manager', name: 'Manager Two' },
    { email: 'auditor2@example.com', password: 'password123', role: 'auditor', name: 'Auditor Two' },
];

router.get('/sync-seeds', async (req: Request, res: Response) => {
    if (req.query.secret !== 'temp-sync-secret') {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const results: any[] = [];

    try {
        for (const userDef of SEED_USERS) {
            const result: any = { email: userDef.email, status: 'processing' };
            const localUser = await prisma.user.findUnique({ where: { email: userDef.email } });

            if (localUser) {
                let kratosId: string | null = null;
                // Check Kratos
                try {
                    const { data: identities } = await kratosAdmin.listIdentities();
                    const existing = identities.find((i: any) =>
                        i.traits.email === userDef.email ||
                        (i.traits.email && i.traits.email.toLowerCase() === userDef.email.toLowerCase())
                    );
                    if (existing) kratosId = existing.id;
                } catch (e: any) {
                    console.error('Kratos list error', e);
                    result.kratosListError = e.message;
                }

                if (!kratosId) {
                    // Create
                    try {
                        const { data: created } = await kratosAdmin.createIdentity({
                            createIdentityBody: {
                                schema_id: 'default',
                                state: 'active' as any,
                                traits: {
                                    email: userDef.email,
                                    name: {
                                        first: userDef.name.split(' ')[0],
                                        last: userDef.name.split(' ').slice(1).join(' ') || ''
                                    },
                                    role: userDef.role
                                },
                                credentials: {
                                    password: { config: { password: userDef.password } }
                                }
                            }
                        });
                        kratosId = created.id;
                        result.action = 'created_kratos';
                    } catch (e: any) {
                        result.createError = e.response?.data?.error?.message || e.message;
                    }
                } else {
                    result.action = 'found_kratos';
                }

                if (kratosId && localUser.id !== kratosId) {
                    // Update ID
                    try {
                        // @ts-ignore
                        const updated = await prisma.$executeRawUnsafe(`UPDATE "users" SET "id" = '${kratosId}' WHERE "email" = '${userDef.email}';`);
                        result.status = 'synced_id_updated';
                        result.oldId = localUser.id;
                        result.newId = kratosId;
                        result.rowsAffected = updated;
                    } catch (e: any) {
                        result.status = 'failed_update';
                        result.error = e.message;
                    }
                } else if (kratosId) {
                    result.status = 'already_synced';
                }
            } else {
                result.status = 'not_in_db';
            }
            results.push(result);
        }
        res.json({ success: true, results });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
