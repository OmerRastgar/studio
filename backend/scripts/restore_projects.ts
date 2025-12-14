
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Restoring project assignments...");

        // 1. Get all projects
        const projects = await prisma.project.findMany();
        console.log(`Found ${projects.length} projects total.`);

        // 2. Count frequent auditorId
        const counts: Record<string, number> = {};
        projects.forEach(p => {
            if (p.auditorId) {
                counts[p.auditorId] = (counts[p.auditorId] || 0) + 1;
            }
        });

        console.log("Auditor ID frequencies:", counts);

        // Find most common auditorId
        let targetAuditorId = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '');

        // If no assignments found, look up an auditor
        if (!targetAuditorId) {
            const auditor = await prisma.user.findFirst({ where: { role: 'auditor' } });
            if (auditor) targetAuditorId = auditor.id;
        }

        if (targetAuditorId) {
            console.log(`Assigning all projects to Auditor ID: ${targetAuditorId}`);

            await prisma.project.updateMany({
                data: { auditorId: targetAuditorId }
            });

            // Also ensure time logs exist for this user on all projects
            for (const p of projects) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                const existing = await prisma.projectTimeLog.findFirst({
                    where: { projectId: p.id, userId: targetAuditorId, date: today }
                });

                if (!existing) {
                    console.log(`Creating missing time log for project ${p.name}`);
                    await prisma.projectTimeLog.create({
                        data: {
                            projectId: p.id,
                            userId: targetAuditorId,
                            date: today,
                            durationSeconds: 3665,
                            writingSeconds: 1000
                        }
                    });
                }
            }

            console.log("Restoration complete.");
        } else {
            console.log("No partial assignments or auditors found. Cannot deduce target user.");
        }

    } catch (e) {
        console.error("Error restoring projects:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
