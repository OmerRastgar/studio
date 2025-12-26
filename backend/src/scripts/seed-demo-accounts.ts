import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';

interface KratosIdentity {
    id: string;
    traits: {
        email: string;
        name: string;
        role: string;
    };
}

// Demo accounts to create
const DEMO_ACCOUNTS = [
    {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        password: 'password123'
    },
    {
        email: 'manager@example.com',
        name: 'Manager User',
        role: 'manager',
        password: 'password123'
    },
    {
        email: 'auditor@example.com',
        name: 'Auditor User',
        role: 'auditor',
        password: 'password123'
    },
    {
        email: 'customer@example.com',
        name: 'Customer User',
        role: 'customer',
        password: 'password123'
    }
];

async function createKratosIdentity(account: typeof DEMO_ACCOUNTS[0]): Promise<KratosIdentity> {
    try {
        const response = await axios.post(`${KRATOS_ADMIN_URL}/admin/identities`, {
            schema_id: 'default',
            traits: {
                email: account.email,
                name: account.name,
                role: account.role
            },
            credentials: {
                password: {
                    config: {
                        password: account.password
                    }
                }
            }
        });

        console.log(`✅ Created Kratos identity: ${account.email} (${account.role})`);
        return response.data;
    } catch (error: any) {
        if (error.response?.status === 409) {
            // Identity already exists, fetch it
            console.log(`ℹ️  Kratos identity already exists: ${account.email}`);
            const existing = await axios.get(`${KRATOS_ADMIN_URL}/admin/identities?credentials_identifier=${account.email}`);
            return existing.data.identities[0];
        }
        throw error;
    }
}

async function syncUserToDatabase(kratosIdentity: KratosIdentity) {
    try {
        const user = await prisma.user.upsert({
            where: { id: kratosIdentity.id },
            update: {
                email: kratosIdentity.traits.email,
                name: kratosIdentity.traits.name,
                role: kratosIdentity.traits.role as any
            },
            create: {
                id: kratosIdentity.id,
                email: kratosIdentity.traits.email,
                name: kratosIdentity.traits.name,
                role: kratosIdentity.traits.role as any
            }
        });

        console.log(`✅ Synced to database: ${user.email}`);
        return user;
    } catch (error) {
        console.error(`❌ Failed to sync ${kratosIdentity.traits.email}:`, error);
        throw error;
    }
}

async function setupRelationships(users: Map<string, any>) {
    const manager = users.get('manager@example.com');
    const auditor = users.get('auditor@example.com');
    const customer = users.get('customer@example.com');

    if (!manager || !auditor || !customer) {
        console.warn('⚠️  Not all users found, skipping relationship setup');
        return;
    }

    console.log('\n📋 Setting up relationships...');

    // Find existing ISO 27001 project
    const existingProject = await prisma.project.findFirst({
        where: {
            framework: {
                contains: 'ISO',
                mode: 'insensitive'
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    if (!existingProject) {
        console.log('⚠️  No existing ISO project found. Please create one first.');
        return;
    }

    console.log(`✅ Found existing project: ${existingProject.name}`);

    // Update project to assign manager and customer if not already set
    await prisma.project.update({
        where: { id: existingProject.id },
        data: {
            managerId: manager.id,
            customerId: customer.id
        }
    });

    console.log(`✅ Updated project ownership`);

    // Assign auditor to the project
    await prisma.projectAssignment.upsert({
        where: {
            projectId_userId: {
                projectId: existingProject.id,
                userId: auditor.id
            }
        },
        update: {},
        create: {
            projectId: existingProject.id,
            userId: auditor.id,
            role: 'auditor'
        }
    });

    console.log(`✅ Assigned auditor to project`);

    // Create manager-customer relationship
    await prisma.managerCustomer.upsert({
        where: {
            managerId_customerId: {
                managerId: manager.id,
                customerId: customer.id
            }
        },
        update: {},
        create: {
            managerId: manager.id,
            customerId: customer.id
        }
    });

    console.log(`✅ Linked manager to customer`);

    // Create manager-auditor relationship
    await prisma.managerAuditor.upsert({
        where: {
            managerId_auditorId: {
                managerId: manager.id,
                auditorId: auditor.id
            }
        },
        update: {},
        create: {
            managerId: manager.id,
            auditorId: auditor.id
        }
    });

    console.log(`✅ Linked manager to auditor`);

    return existingProject;
}

async function main() {
    console.log('🌱 Seeding demo accounts...\n');

    const users = new Map<string, any>();

    try {
        // Step 1: Create Kratos identities and sync to database
        for (const account of DEMO_ACCOUNTS) {
            const kratosIdentity = await createKratosIdentity(account);
            const dbUser = await syncUserToDatabase(kratosIdentity);
            users.set(account.email, dbUser);
        }

        // Step 2: Setup relationships
        const project = await setupRelationships(users);

        console.log('\n✨ Demo accounts seeded successfully!\n');
        console.log('📋 Account Summary:');
        console.log('┌─────────────────────────────┬──────────┬─────────────┐');
        console.log('│ Email                       │ Role     │ Password    │');
        console.log('├─────────────────────────────┼──────────┼─────────────┤');

        DEMO_ACCOUNTS.forEach(acc => {
            console.log(`│ ${acc.email.padEnd(27)} │ ${acc.role.padEnd(8)} │ ${acc.password} │`);
        });

        console.log('└─────────────────────────────┴──────────┴─────────────┘\n');
        console.log('🔗 Relationships:');
        console.log('  • Manager → Customer (linked)');
        console.log('  • Manager → Auditor (linked)');
        if (project) {
            console.log(`  • Auditor → ${project.name} (assigned)`);
            console.log(`  • Customer → ${project.name} (owner)`);
            console.log(`  • Manager → ${project.name} (owner)`);
        }
        console.log('\n🌐 Login: http://localhost/login');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
