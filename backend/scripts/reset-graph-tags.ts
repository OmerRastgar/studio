
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://audituser:auditpass@localhost:5432/auditdb'
        }
    }
});

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

async function resetGraph() {
    console.log('Starting Graph Reset...');
    const session = driver.session();

    try {
        // 1. Wipe Graph
        console.log('Wiping existing graph data...');
        await session.run('MATCH (n) DETACH DELETE n');

        // 2. Sync Users
        console.log('Syncing Users...');
        const users = await prisma.user.findMany();
        for (const user of users) {
            await session.run(`
                MERGE (u:User {id: $id})
                SET u.name = $name, u.email = $email, u.role = $role
            `, { id: user.id, name: user.name, email: user.email, role: user.role });
        }

        // 3. Sync Tags
        console.log('Syncing Tags...');
        const tags = await prisma.tag.findMany();
        for (const tag of tags) {
            await session.run(`
                MERGE (t:Tag {id: $id})
                SET t.name = $name
            `, { id: tag.id, name: tag.name });
        }

        // 4. Sync Controls (and link to Tags)
        console.log('Syncing Controls...');
        const controls = await prisma.control.findMany({ include: { tags: true } });
        for (const control of controls) {
            await session.run(`
                MERGE (c:Control {id: $id})
                SET c.code = $code, c.title = $title
            `, { id: control.id, code: control.code, title: control.title });

            // Link to Tags
            for (const tag of control.tags) {
                await session.run(`
                    MATCH (c:Control {id: $cid})
                    MATCH (t:Tag {id: $tid})
                    MERGE (c)-[:HAS_TAG]->(t)
                `, { cid: control.id, tid: tag.id });
            }
        }

        // 5. Sync Projects (and link to Users)
        console.log('Syncing Projects...');
        const projects = await prisma.project.findMany();
        for (const project of projects) {
            await session.run(`
                MERGE (p:Project {id: $id})
                SET p.name = $name
            `, { id: project.id, name: project.name });

            // Link Auditor
            if (project.auditorId) {
                await session.run(`
                    MATCH (p:Project {id: $pid})
                    MATCH (u:User {id: $uid})
                    MERGE (u)-[:AUDITED_BY]->(p)
                `, { pid: project.id, uid: project.auditorId });
            }
            // Link Customer
            if (project.customerId) {
                await session.run(`
                    MATCH (p:Project {id: $pid})
                    MATCH (u:User {id: $uid})
                    MERGE (u)-[:OWNS]->(p) // Access policy usually just checks ID, but graph can show ownership
                `, { pid: project.id, uid: project.customerId });
            }
        }

        // 6. Sync Evidence (and link to Tags, Uploader)
        console.log('Syncing Evidence...');
        const evidenceList = await prisma.evidence.findMany({ include: { tags: true } });
        for (const evidence of evidenceList) {
            await session.run(`
                MERGE (e:Evidence {id: $id})
                SET e.fileName = $fileName
            `, { id: evidence.id, fileName: evidence.fileName });

            // Link to Tags
            for (const tag of evidence.tags) {
                await session.run(`
                    MATCH (e:Evidence {id: $eid})
                    MATCH (t:Tag {id: $tid})
                    MERGE (e)-[:HAS_TAG]->(t)
                `, { eid: evidence.id, tid: tag.id });
            }

            // Link to Uploader
            if (evidence.uploadedById) {
                await session.run(`
                    MATCH (e:Evidence {id: $eid})
                    MATCH (u:User {id: $uid})
                    MERGE (u)-[:UPLOADED]->(e)
                `, { eid: evidence.id, uid: evidence.uploadedById });
            }
        }

        console.log('Graph Reset Complete.');

    } catch (error) {
        console.error('Graph Reset Failed:', error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

resetGraph();
