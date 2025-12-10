import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                dueDate: true,
                status: true
            }
        });

        console.log('Total Projects:', projects.length);
        if (projects.length === 0) {
            console.log('No projects found.');
        } else {
            console.table(projects.map(p => ({
                name: p.name.substring(0, 20),
                start: p.startDate,
                end: p.endDate,
                due: p.dueDate
            })));
        }

        const events = await prisma.auditEvent.findMany();
        console.log('Total Events:', events.length);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
