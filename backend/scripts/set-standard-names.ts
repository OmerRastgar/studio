
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

async function setNames() {
    const session = driver.session();
    try {
        console.log('--- Setting Standard Names ---');

        // Fetch all frameworks
        const frameworks = await prisma.framework.findMany();
        console.log(`Found ${frameworks.length} frameworks in Postgres.`);

        for (const f of frameworks) {
            console.log(`Updating Standard: ${f.name} (${f.id})`);

            await session.run(`
                MERGE (s:Standard {id: $id})
                SET s.name = $name
            `, { id: f.id, name: f.name });
        }

        console.log('Done.');
    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

setNames();
