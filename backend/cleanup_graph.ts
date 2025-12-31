
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

async function cleanupGraph() {
    console.log('--- STARTING GRAPH GARBAGE COLLECTION ---');
    const session = driver.session();

    try {
        // 1. Get Valid IDs from Postgres
        const frameworks = await prisma.framework.findMany({ select: { id: true, name: true } });
        const validIds = new Set(frameworks.map(f => f.id));
        console.log(`✅ Postgres has ${validIds.size} valid Frameworks.`);

        // 2. Get All Standards from Neo4j
        const result = await session.run(`MATCH (s:Standard) RETURN s.id as id, s.name as name`);
        const graphStandards = result.records.map(r => ({ id: r.get('id'), name: r.get('name') }));
        console.log(`🔎 Graph has ${graphStandards.length} Standards.`);

        // 3. Find Stale Nodes
        const staleStandards = graphStandards.filter(s => !validIds.has(s.id));

        if (staleStandards.length === 0) {
            console.log('✨ Graph is clean. No stale standards found.');
        } else {
            console.log(`⚠️  Found ${staleStandards.length} stale standards to delete:`);
            staleStandards.forEach(s => console.log(`   - ${s.name} (${s.id})`));

            // 4. Delete Stale Nodes
            for (const s of staleStandards) {
                await session.run(`
                    MATCH (s:Standard {id: $id})
                    OPTIONAL MATCH (c:Control)-[:BELONGS_TO]->(s)
                    DETACH DELETE c, s
                `, { id: s.id });
                console.log(`   🗑️  Deleted: ${s.name}`);
            }
        }
    } catch (error) {
        console.error('Cleanup Error:', error);
    } finally {
        await session.close();
        await prisma.$disconnect();
        await driver.close();
    }
}

cleanupGraph();
