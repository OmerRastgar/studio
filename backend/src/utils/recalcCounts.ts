
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * STRICTLY recalculates the evidence count for a given ProjectControl.
 * Does NOT rely on Tags. Purely counts the Explicit DB Links.
 * 
 * @param projectControlId The ID of the ProjectControl to update
 */
export async function recalcEvidenceCounts(projectControlId: string) {
    try {
        if (!projectControlId) return;

        // 1. Count actual linked evidence
        const count = await prisma.evidence.count({
            where: {
                controls: {
                    some: {
                        id: projectControlId
                    }
                }
            }
        });

        // 2. Update the integer field (for performant frontend read)
        await prisma.projectControl.update({
            where: { id: projectControlId },
            data: {
                evidenceCount: count
            }
        });

        console.log(`[Recalc] ProjectControl ${projectControlId}: Count updated to ${count}`);
    } catch (error) {
        console.error(`[Recalc] Failed for ProjectControl ${projectControlId}:`, error);
    }
}
