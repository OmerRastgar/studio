
import { prisma } from '../src/lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        where: { role: { in: ['auditor', 'reviewer'] } } // Exclude manager to reduce noise
    });

    for (const user of users) {
        console.log(`User: ${user.name} (${user.role})`);

        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    { auditorId: user.id },
                    { reviewerAuditorId: user.id }
                ]
            },
            include: {
                timeLogs: true
            }
        });

        if (projects.length === 0) console.log(`  No projects.`);

        for (const p of projects) {
            const dur = p.timeLogs.reduce((s, l) => s + l.durationSeconds, 0);
            console.log(`  Project: ${p.id.substring(0, 5)}... Duration: ${dur}s`);
        }
        console.log('---');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
