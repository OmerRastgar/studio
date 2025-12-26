
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://audituser:auditpass@localhost:5432/auditdb',
        },
    },
});

const KRATOS_ADMIN_URL = 'http://localhost:4434';

async function migrateUsers() {
    console.log('Fetching users from legacy database...');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to migrate.`);

    for (const user of users) {
        console.log(`Migrating user: ${user.email} (${user.role})...`);

        const identityPayload = {
            schema_id: 'default',
            state: 'active',
            traits: {
                email: user.email,
                name: user.name,
                // Make sure role is lowercase or matches what Kratos expects if enum
                role: user.role.toLowerCase(),
            },
            credentials: {
                password: {
                    config: {
                        password: 'password123',
                    },
                },
            },
        };

        try {
            const response = await fetch(`${KRATOS_ADMIN_URL}/admin/identities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(identityPayload),
            });

            if (response.ok) {
                const data: any = await response.json();
                console.log(`✅ Successfully migrated ${user.email}. Kratos ID: ${data.id}`);
                // Optional: Update the user in the DB with the Kratos ID if you added a field for it
            } else {
                const errorText = await response.text();
                // If 409 Conflict, it means user already exists, which is fine.
                if (response.status === 409) {
                    console.log(`⚠️ User ${user.email} already exists in Kratos. Skipping.`);
                } else {
                    console.error(`❌ Failed to migrate ${user.email}: ${response.status} ${errorText}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error migrating ${user.email}:`, error);
        }
    }

    console.log('Migration completed.');
    await prisma.$disconnect();
}

migrateUsers().catch((e) => {
    console.error(e);
    process.exit(1);
});
