
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const evidenceId = '2db319fa-5344-4c0c-8d11-186cbe562b83';

    console.log(`Searching for evidence: ${evidenceId}`);

    const evidence = await prisma.evidence.findUnique({
        where: { id: evidenceId },
        include: {
            project: {
                include: {
                    auditor: true, // User info
                    customer: true // User info
                }
            },
            uploadedBy: true
        }
    });

    if (!evidence) {
        console.log('Evidence NOT FOUND.');
        return;
    }

    console.log('--- EVIDENCE PERMISSION DEBUG ---');
    console.log(`Evidence ID:   ${evidence.id}`);
    console.log(`Uploaded By:   ${evidence.uploadedBy.id} (${evidence.uploadedBy.name}, ${evidence.uploadedBy.role})`);
    console.log(`Project ID:    ${evidence.projectId}`);
    console.log(`Proj Customer: ${evidence.project.customerId} (${evidence.project.customer?.name})`);
    console.log(`Proj Auditor:  ${evidence.project.auditorId} (${evidence.project.auditor?.name})`);
    console.log('---------------------------------');
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
