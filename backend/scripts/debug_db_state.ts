
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- PROJECTS ---');
    const projects = await prisma.project.findMany({
        include: {
            auditor: { select: { id: true, email: true } },
            reviewerAuditor: { select: { id: true, email: true } }
        }
    });
    console.log(JSON.stringify(projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        auditorId: p.auditorId,
        auditorEmail: p.auditor?.email,
        reviewerAuditorId: p.reviewerAuditorId,
        reviewerEmail: p.reviewerAuditor?.email
    })), null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
