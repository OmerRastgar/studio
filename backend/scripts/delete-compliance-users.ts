import { PrismaClient } from '@prisma/client';
import { Configuration, IdentityApi } from "@ory/client";

const prisma = new PrismaClient();

// Use localhost for host-side execution
const apiBaseUrl = process.env.KRATOS_ADMIN_URL || "http://localhost:4434";

const kratosAdmin = new IdentityApi(
    new Configuration({
        basePath: apiBaseUrl,
    })
);

const emailsToDelete = [
    "comp2@example.com",
    "comp@example.com"
];

async function main() {
    console.log(`Starting cleanup using Kratos at ${apiBaseUrl}...`);

    for (const email of emailsToDelete) {
        console.log(`Processing ${email}...`);

        // 1. Check Prisma
        const user = await prisma.user.findUnique({ where: { email } });
        let kratosId = user?.id;

        if (user) {
            console.log(`Found Prisma user: ${user.id}`);
            // Delete from Prisma first to clear constraints (optional order, but usually safe)
            // Actually delete Kratos first to ensure we don't leave orphan identity if prisma fails
            // But if we delete Kratos and Prisma fails, we have zombie DB record.
            // I'll delete Kratos first.

        } else {
            console.log('User not found in Prisma. Searching Kratos directly...');
            try {
                // List identities to find ID
                const { data: identities } = await kratosAdmin.listIdentities();
                // Filter by trait email
                // Note: traits type is any/object
                const identity = identities.find((i: any) => i.traits?.email === email);
                if (identity) {
                    kratosId = identity.id;
                    console.log(`Found orphan identity in Kratos: ${kratosId}`);
                }
            } catch (e: any) {
                console.error(`Failed to list identities: ${e.message}`);
            }
        }

        if (kratosId) {
            // Delete from Kratos
            try {
                await kratosAdmin.deleteIdentity({ id: kratosId });
                console.log(`Deleted from Kratos: ${kratosId}`);
            } catch (e: any) {
                console.error(`Failed to delete from Kratos: ${e.message}`);
            }
        } else {
            console.log(`No Kratos ID found for ${email}`);
        }

        // Delete from Prisma if it existed
        if (user) {
            try {
                await prisma.user.delete({ where: { id: user.id } });
                console.log(`Deleted from Prisma: ${user.id}`);
            } catch (e: any) {
                console.error(`Failed to delete from Prisma: ${e.message}`);
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
