
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Ensuring universal visibility...");

        // 1. Find all auditors
        const auditors = await prisma.user.findMany({
            where: { role: 'auditor' }
        });

        console.log(`Found ${auditors.length} auditors.`);
        auditors.forEach(a => console.log(`Auditor: ${a.name} (${a.id})`));

        if (auditors.length < 1) {
            console.log("No auditors found!");
            return;
        }

        // 2. Get all projects
        const projects = await prisma.project.findMany();
        console.log(`Found ${projects.length} projects.`);

        // 3. Assign Primary and Secondary (Reviewer) to cover bases
        // We will assign auditorId to the first auditor, and reviewerAuditorId to the second (if exists)
        // If there are more projects, we can distribute? 
        // Or better: If we have 2 auditors, make sure BOTH can see ALL projects.
        // We can't make both "auditor" (one to one).
        // But we can make one auditor and one reviewer.

        const auditor1 = auditors[0];
        const auditor2 = auditors.length > 1 ? auditors[1] : auditors[0]; // fallback to self if only 1

        for (const p of projects) {
            console.log(`Updating Project ${p.name}...`);
            await prisma.project.update({
                where: { id: p.id },
                data: {
                    auditorId: auditor1.id,
                    reviewerAuditorId: auditor1.id !== auditor2.id ? auditor2.id : undefined
                }
            });

            // 4. Ensure Time Logs for BOTH auditors
            const relevantAuditors = [auditor1];
            if (auditor1.id !== auditor2.id) relevantAuditors.push(auditor2);

            for (const aud of relevantAuditors) {
                const today = new Date();
                today.setUTCHours(0, 0, 0, 0);

                const existing = await prisma.projectTimeLog.findFirst({
                    where: { projectId: p.id, userId: aud.id, date: today }
                });

                if (!existing || existing.durationSeconds === 0) {
                    console.log(`Seeding time for ${aud.name} on ${p.name}`);
                    await prisma.projectTimeLog.upsert({
                        where: { projectId_userId_date: { projectId: p.id, userId: aud.id, date: today } },
                        create: {
                            projectId: p.id,
                            userId: aud.id,
                            date: today,
                            durationSeconds: 3665,
                            writingSeconds: 1000
                        },
                        update: {
                            durationSeconds: 3665 // Force update if 0
                        }
                    });
                }
            }
        }

        console.log("Universal visibility applied. Both auditors (if 2 exist) should see all projects.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
