
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
);

async function hydrateGraph() {
    const session = driver.session();
    try {
        console.log('--- Hydrating Graph Properties ---');

        // 1. Evidence: fileName
        const allEvidence = await prisma.evidence.findMany({ select: { id: true, fileName: true } });
        console.log(`Hydrating ${allEvidence.length} Evidence nodes...`);
        for (const e of allEvidence) {
            await session.run(`
                MATCH (n:Evidence {id: $id})
                SET n.fileName = $fileName
            `, { id: e.id, fileName: e.fileName });
        }

        // 2. Controls: code, title
        const allControls = await prisma.control.findMany({ select: { id: true, code: true, title: true } });
        console.log(`Hydrating ${allControls.length} Control nodes...`);
        for (const c of allControls) {
            await session.run(`
                MATCH (n:Control {id: $id})
                SET n.code = $code, n.title = $title
            `, { id: c.id, code: c.code, title: c.title });
        }

        // 3. Tags: name
        const allTags = await prisma.tag.findMany({ select: { id: true, name: true } });
        console.log(`Hydrating ${allTags.length} Tag nodes...`);
        for (const t of allTags) {
            await session.run(`
                MATCH (n:Tag {id: $id})
                SET n.name = $name
            `, { id: t.id, name: t.name });
        }

        // 4. Projects: name
        const allProjects = await prisma.project.findMany({ select: { id: true, name: true } });
        console.log(`Hydrating ${allProjects.length} Project nodes...`);
        for (const p of allProjects) {
            await session.run(`
                MATCH (n:Project {id: $id})
                SET n.name = $name
            `, { id: p.id, name: p.name });
        }

        console.log('Hydration Completed.');

    } catch (error) {
        console.error('Error during hydration:', error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

hydrateGraph();
