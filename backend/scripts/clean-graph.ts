
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

async function cleanGraph() {
    const session = driver.session();
    try {
        console.log('--- Cleaning Stale Graph Data ---');

        // 1. Get valid IDs from Postgres
        const validEvidence = await prisma.evidence.findMany({ select: { id: true } });
        const validIds = new Set(validEvidence.map(e => e.id));
        console.log(`Valid Evidence count in Postgres: ${validIds.size}`);

        // 2. Get all Evidence IDs from Neo4j
        const neoResult = await session.run(`MATCH (e:Evidence) RETURN e.id as id`);
        const neoIds = neoResult.records.map(r => r.get('id')); // These might be strings or numbers depending on UUID handling, assume string
        console.log(`Evidence count in Neo4j: ${neoIds.length}`);

        // 3. Find stale IDs
        const staleIds = neoIds.filter(id => !validIds.has(id));
        console.log(`Found ${staleIds.length} stale Evidence nodes to delete.`);

        if (staleIds.length > 0) {
            // 4. Delete stale nodes
            await session.run(`
                MATCH (e:Evidence)
                WHERE e.id IN $staleIds
                DETACH DELETE e
            `, { staleIds });
            console.log('Successfully deleted stale nodes.');
        } else {
            console.log('No stale nodes found.');
        }

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

cleanGraph();
