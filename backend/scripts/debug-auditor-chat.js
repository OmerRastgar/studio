const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- 1. Listing All Users ---');
    const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, role: true, email: true }
    });
    console.log(JSON.stringify(allUsers, null, 2));

    console.log('\n--- 2. Simulating Auditor Query ---');
    // Find the auditor user
    const auditor = allUsers.find(u => u.role === 'auditor');
    if (!auditor) {
        console.log('ERROR: No auditor found in DB');
        return;
    }
    console.log(`Running query for Auditor: ${auditor.name} (${auditor.id})`);

    const userId = auditor.id;
    // EXACT query from chat.ts (for case 'auditor')
    const auditorContacts = await prisma.user.findMany({
        where: {
            OR: [
                { customerProjects: { some: { auditorId: userId } } },
                { customerProjects: { some: { reviewerAuditorId: userId } } },
                { role: { in: ['auditor', 'manager', 'admin'] } }
            ],
            id: { not: userId }
        },
        select: {
            id: true,
            name: true,
            role: true
        }
    });

    console.log(`Found ${auditorContacts.length} contacts for auditor.`);
    console.log(JSON.stringify(auditorContacts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
