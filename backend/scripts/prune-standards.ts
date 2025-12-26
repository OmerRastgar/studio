
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123'),
    { disableLosslessIntegers: true }
);

async function prune() {
    const session = driver.session();
    try {
        console.log('--- Pruning Stale Standards ---');

        // 1. Get valid Framework IDs from Postgres
        const frameworks = await prisma.framework.findMany({ select: { id: true, name: true } });
        const validIds = frameworks.map(f => f.id);

        console.log(`Valid Framework IDs in Postgres: ${validIds.length}`);
        validIds.forEach(id => console.log(`- ${id}`));

        // 2. Find Standards in Neo4j NOT in validIds
        const result = await session.run(`
            MATCH (s:Standard)
            WHERE NOT s.id IN $validIds
            RETURN s.id, s.name, count{(s)<-[:BELONGS_TO]-(c:Control)} as controls
        `, { validIds });

        if (result.records.length === 0) {
            console.log('No stale standards found.');
            return;
        }

        console.log(`Found ${result.records.length} stale standards:`);
        for (const r of result.records) {
            const id = r.get('s.id');
            const name = r.get('s.name');
            const controls = r.get('controls');
            console.log(`- [DELETE] ${name} (${id}) - Has ${controls} controls`);

            // 3. Delete them (and their controls?)
            // Usually we want to cascade delete the controls attached to them if they are truly stale?
            // If the framework is gone from Postgres, its controls should be gone too.
            // But let's be careful. Let's just detach delete the standard for now, 
            // verifying that the controls are likely orphaned or we delete the whole tree.

            // If we delete the Standard, the controls linked to it are also stale if they don't belong to another standard (which validly they shouldn't).
            // Let's delete the Standard and its BELONGS_TO relationships.
            // If we assume controls are also stale, we should delete them.

            await session.run(`
                MATCH (s:Standard {id: $id})
                OPTIONAL MATCH (c:Control)-[:BELONGS_TO]->(s)
                DETACH DELETE c, s
            `, { id });
            console.log(`  Deleted Standard ${name} and its controls.`);
        }

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

prune();
