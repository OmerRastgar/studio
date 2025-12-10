const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Checking Projects ---');
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            customerId: true,
            auditorId: true,
            reviewerAuditorId: true
        }
    });

    console.table(projects);

    if (projects.length === 0) {
        console.log('WARNING: No projects found. Customers and Auditors will have NO contacts.');
    } else {
        console.log(`Found ${projects.length} projects.`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
