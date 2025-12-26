
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

async function repairLinks() {
    const session = driver.session();
    try {
        console.log('--- Repairing Evidence Links (Aggressive) ---');

        // 0. Nuke existing uploaded links
        console.log('Deleting ALL existing UPLOADED relationships...');
        await session.run(`MATCH ()-[r:UPLOADED]->() DELETE r`);
        console.log('All UPLOADED links deleted.');

        // 1. Get all evidence from Postgres
        const allEvidence = await prisma.evidence.findMany({
            select: { id: true, fileName: true, uploadedById: true }
        });

        console.log(`Found ${allEvidence.length} evidence items in Postgres.`);

        for (const ev of allEvidence) {
            console.log(`Linking Evidence ${ev.fileName} (${ev.id}) to User ${ev.uploadedById}...`);

            // 2. Create the CORRECT link
            await session.run(`
                MERGE (u:User {id: $userId})
                MERGE (e:Evidence {id: $evidenceId})
                MERGE (u)-[:UPLOADED]->(e)
            `, { userId: ev.uploadedById, evidenceId: ev.id });
        }

        // 3. Clean up orphans (Ghost Users with no uploads)
        console.log('Cleaning up Ghost Users...');
        await session.run(`
            MATCH (u:User)
            WHERE NOT (u)-[:UPLOADED]->() AND u.email IS NULL
            DETACH DELETE u
        `);
        console.log('Orphans removed.');

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

repairLinks();
