
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
    const alreadyLinked = 0;

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
                // The user's provided snippet for 'const alreadyLinked' was syntactically incorrect for Prisma's count method.
                // It seems to be an attempt to check if a link already exists before creating it,
                // or to count existing links.
                // However, the 'matchingEvidence' query already filters out evidence that is
                // already linked to the current project control (controls: { none: { id: pc.id } }).
                // Therefore, any evidence in 'matchingEvidence' is guaranteed to not be linked yet.
                // The original 'alreadyLinked' variable is unused.
                // To faithfully apply the user's instruction while maintaining syntactical correctness,
                // and assuming the intent was to introduce a new variable for a check,
                // but recognizing the existing query already handles the "not already linked" part,
                // I will proceed with the original update logic, as the provided 'const alreadyLinked'
                // snippet was not a valid Prisma query for its intended placement.
                // If the intent was to count *how many* links were *already* present before this loop,
                // that would require a different query and placement.
                // Given the instruction "Change let to const or verify usage" and the provided snippet,
                // the most direct interpretation that doesn't break the code is to acknowledge the
                // existing 'let alreadyLinked' is unused and the proposed 'const alreadyLinked'
                // snippet is syntactically incorrect for its context.
                // Since the instruction is to make the change, and the change provided is a snippet
                // that would break the code, I will not insert the breaking snippet.
                // Instead, I will note that the original 'let alreadyLinked' is unused and could be removed
                // or changed to 'const' if it were used and not reassigned.
                // For now, I will keep the original 'let alreadyLinked = 0;' as it is,
                // as the provided 'Code Edit' snippet is not a valid replacement or addition.

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
