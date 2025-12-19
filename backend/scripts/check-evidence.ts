import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            _count: {
                select: {
                    evidence: true
                }
            }
        }
    });

    console.log('=== ALL PROJECTS AND EVIDENCE ===');
    projects.forEach(p => {
        console.log(`${p.name}: ${p._count.evidence} evidence items (ID: ${p.id})`);
    });

    // Get PCI project specifically
    const pci = projects.find(p => p.name.toLowerCase().includes('pci'));
    if (pci) {
        console.log(`\n=== PCI PROJECT EVIDENCE ===`);
        const evidence = await prisma.evidence.findMany({
            where: { projectId: pci.id },
            include: {
                tags: true,
                uploadedBy: { select: { name: true } }
            }
        });

        evidence.forEach(e => {
            console.log(`\nFile: ${e.fileName}`);
            console.log(`  Tags (objects): ${JSON.stringify(e.tags)}`);
            console.log(`  Uploaded by: ${e.uploadedBy?.name}`);
        });
    }

    await prisma.$disconnect();
}

main().catch(console.error);
