
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
let NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
let NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

if (process.env.NEO4J_AUTH) {
    const [auth_user, auth_pass] = process.env.NEO4J_AUTH.split('/');
    if (auth_user && auth_pass) {
        NEO4J_USER = auth_user;
        NEO4J_PASSWORD = auth_pass;
    }
}

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

async function backfillStandards() {
    console.log('Fetching frameworks from Postgres...');
    const frameworks = await prisma.framework.findMany();
    console.log(`Found ${frameworks.length} frameworks.`);

    const session = driver.session();
    try {
        for (const fw of frameworks) {
            console.log(`Syncing ${fw.name} (${fw.id}) to Neo4j...`);
            await session.run(`
                MERGE (s:Standard {id: $id})
                SET s.name = $name,
                    s.updatedAt = datetime(),
                    s.backfilled = true
            `, { id: fw.id, name: fw.name });
            console.log(`Synced ${fw.name}.`);
        }
        console.log('Backfill complete.');
    } catch (error) {
        console.error('Backfill error:', error);
    } finally {
        await session.close();
        await prisma.$disconnect();
        await driver.close();
    }
}

backfillStandards();
