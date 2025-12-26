
import { PrismaClient } from '@prisma/client';
import { GraphService } from '../src/services/graph.service';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123'),
    { disableLosslessIntegers: true }
);

async function syncGraph() {
    console.log('Starting Graph Sync...');

    try {
        // 1. Fetch all evidence
        const allEvidence = await prisma.evidence.findMany({
            include: {
                controls: { include: { control: true } },
                tags: true,
                uploadedBy: true
            }
        });

        console.log(`Found ${allEvidence.length} evidence items.`);

        for (const evidence of allEvidence) {
            console.log(`Syncing Evidence ${evidence.id} (${evidence.fileName})...`);

            // Link Uploader
            if (evidence.uploadedById) {
                const role = evidence.uploadedBy?.role || 'unknown';
                await GraphService.linkEvidenceUploader(evidence.id, evidence.uploadedById, role);
            }

            // Link Project
            if (evidence.projectId) {
                await GraphService.linkEvidenceToProject(evidence.id, evidence.projectId);
            }

            // Link Controls
            if (evidence.controls && evidence.controls.length > 0) {
                for (const pc of evidence.controls) {
                    if (pc.control) {
                        await GraphService.linkEvidenceToControl(evidence.id, pc.control.id);
                        // Also ensure Control -> Standard link
                        if (pc.control.frameworkId) {
                            await GraphService.linkControlToStandard(pc.control.id, pc.control.frameworkId);
                        }
                    }
                }
            }

            if (evidence.tags && evidence.tags.length > 0) {
                for (const tag of evidence.tags) {
                    await GraphService.linkEvidenceToTag(evidence.id, tag.id);
                }
            }

            // Hydrate Property
            await GraphService.updateNodeProperty('Evidence', evidence.id, 'fileName', evidence.fileName);
        }

        // 2. Sync ALL Controls (Skeleton)
        const allControls = await prisma.control.findMany({
            include: { tags: true }
        });
        console.log(`Found ${allControls.length} controls to sync.`);

        for (const control of allControls) {
            if (control.frameworkId) {
                await GraphService.linkControlToStandard(control.id, control.frameworkId);
            }
            if (control.tags && control.tags.length > 0) {
                for (const tag of control.tags) {
                    await GraphService.linkControlToTag(control.id, tag.id);
                }
            }
            // Hydrate properties
            const session = driver.session();
            try {
                await session.run(`
                    MATCH (c:Control {id: $id})
                    SET c.code = $code, c.title = $title
                `, { id: control.id, code: control.code, title: control.title });
            } finally {
                await session.close();
            }
        }

        // 3. Pruning Phase (Deletions)
        console.log('--- Pruning Stale Data ---');
        const session = driver.session();
        try {
            // Prune Evidence
            const validEvidenceIds = allEvidence.map(e => e.id);
            const staleEvidence = await session.run(`
                MATCH (e:Evidence)
                WHERE NOT e.id IN $validEvidenceIds
                RETURN e.id, e.fileName
             `, { validEvidenceIds });

            for (const r of staleEvidence.records) {
                console.log(`[DELETE] Stale Evidence: ${r.get('e.fileName')} (${r.get('e.id')})`);
                await session.run(`MATCH (e:Evidence {id: $id}) DETACH DELETE e`, { id: r.get('e.id') });
            }

            // Prune Standards (Frameworks)
            const frameworks = await prisma.framework.findMany({ select: { id: true } });
            const validFrameworkIds = frameworks.map(f => f.id);

            const staleStandards = await session.run(`
                MATCH (s:Standard)
                WHERE NOT s.id IN $validFrameworkIds
                RETURN s.id, s.name
             `, { validFrameworkIds });

            for (const r of staleStandards.records) {
                console.log(`[DELETE] Stale Standard: ${r.get('s.name')} (${r.get('s.id')})`);
                await session.run(`MATCH (s:Standard {id: $id}) DETACH DELETE s`, { id: r.get('s.id') });
            }

        } finally {
            await session.close();
        }

        console.log('Graph Sync & Pruning Completed.');
    } catch (error) {
        console.error('Error during graph sync:', error);
    } finally {
        await driver.close();
        await prisma.$disconnect();
    }
}

syncGraph();

