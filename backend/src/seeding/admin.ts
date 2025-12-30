import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';

export async function seedAdmin() {
    console.log('🛡️  Seeding System Administrator...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    try {
        // 1. Create/Get Kratos Identity
        let kratosId = '';
        try {
            const response = await axios.post(`${KRATOS_ADMIN_URL}/admin/identities`, {
                schema_id: 'default',
                state: 'active',
                traits: {
                    email: adminEmail,
                    name: 'System Admin',
                    role: 'admin'
                },
                credentials: {
                    password: {
                        config: {
                            password: adminPassword
                        }
                    }
                }
            });
            kratosId = response.data.id;
            console.log(`   ✅ Kratos Identity created: ${kratosId}`);
        } catch (error: any) {
            if (error.response?.status === 409) {
                // Fetch existing ID
                const existing = await axios.get(`${KRATOS_ADMIN_URL}/admin/identities?credentials_identifier=${adminEmail}`);

                if (Array.isArray(existing.data) && existing.data.length > 0) {
                    kratosId = existing.data[0].id;
                } else {
                    throw new Error('Admin identity mismatch found but not retrievable.');
                }
            } else {
                throw error;
            }
        }

        // 2. Sync to Database
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        await prisma.user.upsert({
            where: { email: adminEmail },
            update: {
                id: kratosId, // Ensure ID sync if email matches
                role: 'admin',
                password: hashedPassword
            },
            create: {
                id: kratosId,
                email: adminEmail,
                name: 'System Admin',
                role: 'admin',
                password: hashedPassword,
                status: 'Active',
                avatarUrl: 'https://github.com/shadcn.png'
            }
        });

        console.log(`   ✅ Database System Admin synced`);

    } catch (error) {
        console.error('   ❌ Failed to seed admin:', error);
        throw error;
    }
}
