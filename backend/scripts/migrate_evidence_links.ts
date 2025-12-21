
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateEvidenceLinks() {
    console.log('Starting Evidence Link Migration...');

    // 1. Fetch all ProjectControls that have tags
    // We need to know which tags map to which control in which project
    const projectControls = await prisma.projectControl.findMany({
        include: {
            control: {
                include: { tags: true }
            },
            evidence: true // Check existing links
        }
    });

    console.log(`Found ${projectControls.length} ProjectControls to scan.`);

    let linksCreated = 0;
    let alreadyLinked = 0;

    for (const pc of projectControls) {
        if (!pc.control.tags || pc.control.tags.length === 0) continue;

        const tagNames = pc.control.tags.map(t => t.name);

        // 2. Find Evidence in the SAME project that has at least one matching tag
        // AND is not already linked
        const matchingEvidence = await prisma.evidence.findMany({
            where: {
                projectId: pc.projectId,
                tags: {
                    some: {
                        name: { in: tagNames }
                    }
                },
                // Optional: Optimization to skip already linked?
                // For safety, let's just fetch all matches and check relation memory or existing ID list
                // logic: NOT { controls: { some: { id: pc.id } } }
                controls: {
                    none: {
                        id: pc.id
                    }
                }
            }
        });

        if (matchingEvidence.length > 0) {
            console.log(`PC ${pc.id} (${pc.control.code}): Found ${matchingEvidence.length} orphan evidence items by tag.`);

            // 3. Create Links
            for (const ev of matchingEvidence) {
                await prisma.projectControl.update({
                    where: { id: pc.id },
                    data: {
                        evidence: {
                            connect: { id: ev.id }
                        }
                    }
                });
                linksCreated++;
            }
        } else {
            // Check implicit "already linked" just for stats
            // actually we filtered them out in query
        }
    }

    console.log('Migration Complete.');
    console.log(`Total New Links Created: ${linksCreated}`);

    // Optional: Recalculate counts strictly
    console.log('Recalculating Counts...');
    const allPCs = await prisma.projectControl.findMany({ select: { id: true } });
    for (const p of allPCs) {
        const count = await prisma.evidence.count({
            where: { controls: { some: { id: p.id } } }
        });
        await prisma.projectControl.update({
            where: { id: p.id },
            data: { evidenceCount: count }
        });
    }
    console.log('Counts Updated.');
}

migrateEvidenceLinks()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
