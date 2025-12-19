
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get the first project for the customer (assuming single project for now, or list all)
    const projects = await prisma.project.findMany({
        include: {
            projectControls: {
                include: {
                    control: {
                        include: { tags: true }
                    }
                }
            }
        }
    });

    console.log(`Found ${projects.length} projects.`);

    for (const p of projects) {
        console.log(`\nProject: ${p.name} (${p.id})`);

        const evidence = await prisma.evidence.findMany({
            where: { projectId: p.id },
            include: { tags: true }
        });

        console.log(`  Total Evidence Items: ${evidence.length}`);
        evidence.forEach((e, i) => {
            console.log(`    Evidence [${i}] ${e.fileName} (ID: ${e.id})`);
            console.log(`      Tags: ${e.tags.map(t => t.name).join(', ')}`);
        });

        console.log(`  Controls:`);
        p.projectControls.forEach(pc => {
            if (pc.evidenceCount > 0) {
                console.log(`    Control ${pc.control.code}: ${pc.control.title}`);
                console.log(`      Control Tags: ${pc.control.tags.map(t => t.name).join(', ')}`);

                // Simulate matching locally
                const matches = evidence.filter(ev =>
                    ev.tags.some(evt =>
                        pc.control.tags.some(pct => pct.name.toLowerCase() === evt.name.toLowerCase())
                    )
                );
                console.log(`      Matched Evidence Count (Script Calc): ${matches.length}`);
                console.log(`      Stored Evidence Count (DB): ${pc.evidenceCount}`);
            }
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
