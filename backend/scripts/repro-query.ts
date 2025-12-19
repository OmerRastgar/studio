
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({ where: { role: 'auditor' } });
    if (!user) { console.log('No auditor found'); return; }
    const userId = user.id;
    const userRole = user.role;
    console.log(`Using Auditor: ${user.email} (${userId})`);

    const whereClause: any = {};
    if (userRole !== 'manager') {
        whereClause.OR = [
            { auditorId: userId },
            { reviewerAuditorId: userId }
        ];
    }

    console.log("Querying with where:", JSON.stringify(whereClause, null, 2));


    try {
        const project = await prisma.project.findFirst();
        if (project) {
            console.log(`Project: ${project.name}`);
            console.log(`AuditorID in DB: ${JSON.stringify(project.auditorId)}`);
            console.log(`Target UserID:   ${JSON.stringify(userId)}`);
            if (project.auditorId) {
                console.log(`Case Insensitive Match? ${project.auditorId.toLowerCase() === userId.toLowerCase()}`);
            }
            if (project.auditorId) {
                console.log(`DB Length: ${project.auditorId.length}, Target Length: ${userId.length}`);
            }
        } else {
            console.log("No projects found at all!");
        }

        const explicitMatch = await prisma.project.findMany({
            where: { auditorId: userId }
        });
        console.log(`Explicit auditorId match count: ${explicitMatch.length}`);

    } catch (e) {
        console.error(e);
    }
}

main();
