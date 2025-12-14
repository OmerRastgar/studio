
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const project = await prisma.project.findFirst();
        if (!project) {
            console.log("No projects found.");
            return;
        }

        const updated = await prisma.project.update({
            where: { id: project.id },
            data: { status: 'returned' }
        });

        console.log(`UPDATED_PROJECT_NAME: ${updated.name}`);
        console.log(`UPDATED_PROJECT_ID: ${updated.id}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
