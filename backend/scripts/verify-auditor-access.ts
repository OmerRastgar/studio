
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- Verifying Auditor Access ---');

        // 1. Get all users with role 'auditor'
        const auditors = await prisma.user.findMany({
            where: { role: 'auditor' }
        });

        // 2. Get all projects
        const projects = await prisma.project.findMany({
            select: {
                id: true,
                name: true,
                auditorId: true,
                reviewerAuditorId: true,
                auditor: { select: { email: true } }
            }
        });



        const analysis = auditors.map(auditor => {
            const assigned = projects.filter(p => p.auditorId === auditor.id || p.reviewerAuditorId === auditor.id);
            if (assigned.length > 0) {
                console.log(`Auditor: ${auditor.id}`);
                console.log(`Matched Project: ${assigned[0].name} - AuditorID: ${assigned[0].auditorId}`);
                console.log(`Strict Match? ${assigned[0].auditorId === auditor.id}`);
            }
            return {
                id: auditor.id,
                email: auditor.email,
                role: auditor.role,
                assignedProjectsCount: assigned.length,
                projectNames: assigned.map(p => p.name)
            };
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
