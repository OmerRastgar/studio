
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://audituser:auditpass@localhost:5432/auditdb'
        }
    }
});

async function migrateTags() {
    console.log('Starting Tag Migration...');

    try {
        // 1. Migrate Controls
        console.log('Migrating Controls...');
        const controls = await prisma.control.findMany();
        let controlsUpdated = 0;

        for (const control of controls) {
            const tags = control.tags || [];
            if (tags.length === 0) continue;

            const connectedTags = [];
            for (const tagName of tags) {
                if (!tagName.trim()) continue;
                // Upsert Tag
                const tag = await prisma.tag.upsert({
                    where: { name: tagName.trim() },
                    update: {},
                    create: { name: tagName.trim() }
                });
                connectedTags.push({ id: tag.id });
            }

            if (connectedTags.length > 0) {
                await prisma.control.update({
                    where: { id: control.id },
                    data: {
                        tagRelations: {
                            connect: connectedTags
                        }
                    }
                });
                controlsUpdated++;
            }
        }
        console.log(`Controls migrated: ${controlsUpdated}`);

        // 2. Migrate Evidence
        console.log('Migrating Evidence...');
        // Fetch evidence with linked controls to inherit tags
        const evidenceList = await prisma.evidence.findMany({
            include: {
                controls: {
                    include: {
                        control: true
                    }
                }
            }
        });
        let evidenceUpdated = 0;

        for (const evidence of evidenceList) {
            const myTags = new Set<string>();

            // existing explicit tags
            if (evidence.tags && Array.isArray(evidence.tags)) {
                evidence.tags.forEach(t => myTags.add(t.trim()));
            }

            // inherited tags from linked controls
            if (evidence.controls) {
                evidence.controls.forEach(pc => {
                    if (pc.control && pc.control.tags) {
                        pc.control.tags.forEach(t => myTags.add(t.trim()));
                    }
                });
            }

            if (myTags.size === 0) continue;

            const connectedTags = [];
            for (const tagName of myTags) {
                if (!tagName) continue;
                const tag = await prisma.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName }
                });
                connectedTags.push({ id: tag.id });
            }

            if (connectedTags.length > 0) {
                await prisma.evidence.update({
                    where: { id: evidence.id },
                    data: {
                        tagRelations: {
                            connect: connectedTags
                        }
                    }
                });
                evidenceUpdated++;
            }
        }
        console.log(`Evidence migrated: ${evidenceUpdated}`);

        console.log('Migration Complete.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateTags();
