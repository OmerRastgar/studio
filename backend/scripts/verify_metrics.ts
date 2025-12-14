
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Verifying ProjectTimeLog access...");

        // Check if we can query the model
        const logs = await prisma.projectTimeLog.findMany();
        console.log(`Found ${logs.length} time logs.`);

        // Create a dummy log if none exist
        if (logs.length === 0) {
            const users = await prisma.user.findMany();
            console.log("Users:", users.map(u => ({ id: u.id, name: u.name, role: u.role })));

            const projects = await prisma.project.findMany();
            console.log("Projects:", projects.map(p => ({ id: p.id, name: p.name, auditorId: p.auditorId })));

            const user = await prisma.user.findFirst({ where: { role: 'auditor' } });
            // Just grab the first project
            let project = await prisma.project.findFirst();

            if (user && project) {
                console.log(`Assigning Project ${project.name} to User ${user.name} (${user.id})`);
                project = await prisma.project.update({
                    where: { id: project.id },
                    data: { auditorId: user.id }
                });

                console.log(`Creating dummy log for User ${user.name} on Project ${project.name}`);
                await prisma.projectTimeLog.create({
                    data: {
                        projectId: project.id,
                        userId: user.id,
                        date: new Date(),
                        durationSeconds: 3665, // 1h 1m 5s
                        writingSeconds: 1000,
                        attachingSeconds: 500
                    }
                });
                console.log("Dummy log created.");
            } else {
                console.log("Could not find auditor or project to seed.");
            }
        }

        // Re-query projects with details
        const projects = await prisma.project.findMany({
            include: {
                timeLogs: true
            }
        });

        console.log(`Found ${projects.length} projects.`);
        projects.forEach(p => {
            const duration = p.timeLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
            console.log(`Project ${p.name}: ${duration} seconds logged.`);
        });

    } catch (e) {
        console.error("Error verifying metrics:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
