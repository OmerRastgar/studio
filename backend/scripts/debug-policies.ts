
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Debugging Real Evidence (Evidence Table) ---');

    // Find all evidence in the new table
    const evidence = await prisma.evidence.findMany({
        include: {
            tags: true,
            project: {
                include: { customer: true }
            }
        }
    });

    console.log(`Found ${evidence.length} TOTAL evidence items.`);

    evidence.forEach(e => {
        console.log(`\nEvidence: ${e.fileName} (ID: ${e.id})`);
        const tagNames = e.tags.map(t => t.name);
        console.log(`  Tags: ${tagNames.join(', ')}`);
        console.log(`  Project: ${e.project.name} (ID: ${e.projectId})`);
        console.log(`  Uploaded By: ${e.uploadedById}`);

        const isPolicy = tagNames.some(t => ['Policy', 'policy'].includes(t));
        if (isPolicy) {
            console.log('  [MATCHES POLICY TAG]');
        }
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
