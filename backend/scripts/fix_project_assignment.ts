
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://audituser:auditpass@localhost:5432/auditdb',
        },
    },
});

async function main() {
    // 1. Get Auditor2
    const auditor2 = await prisma.user.findUnique({
        where: { email: 'auditor2@gmail.com' }
    });

    if (!auditor2) {
        console.error('Auditor2 not found');
        return;
    }

    console.log('Auditor2 found:', auditor2.id);

    // 2. Find a project to assign (e.g. "Audit for Client X")
    // We'll take the first project that isn't assigned to auditor2 as the main auditor
    const project = await prisma.project.findFirst({
        where: {
            auditorId: { not: auditor2.id }
        }
    });

    if (!project) {
        console.error('No suitable project found to assign reviewer');
        return;
    }

    console.log('Assigning reviewer to project:', project.name, project.id);

    // 3. Assign
    const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
            reviewerAuditorId: auditor2.id
        }
    });

    console.log('Updated Project:', updated);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
