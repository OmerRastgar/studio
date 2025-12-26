
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    { disableLosslessIntegers: true }
);

async function debugQuery() {
    const session = driver.session();
    try {
        console.log('Connecting to Neo4j...');

        // 1. Check Standards Existence
        const r1 = await session.run('MATCH (s:Standard) RETURN count(s) as count, collect(s.name) as names');
        console.log('Standards found:', r1.records[0].get('count').toNumber(), r1.records[0].get('names'));

        // 2. Check Controls Existence
        const r2 = await session.run('MATCH (c:Control) RETURN count(c) as count');
        console.log('Controls found:', r2.records[0].get('count').toNumber());

        // 3. Check Relationships
        const r3 = await session.run('MATCH (c:Control)-[:BELONGS_TO]->(s:Standard) RETURN s.name, count(c) as control_count');
        r3.records.forEach(r => {
            console.log(`Standard ${r.get('s.name')} has ${r.get('control_count').toNumber()} linked controls.`);
        });

        // 4. Run the Actual Query
        console.log('Running Projection Query...');
        const query = `
            MATCH (total_c:Control)-[:BELONGS_TO]->(s:Standard)
            WITH s, count(DISTINCT total_c) as total
            
            // Just return what we found so far
            RETURN s.id as id, s.name as name, total
        `;
        const r4 = await session.run(query);
        console.log('Query Results (Basic):');
        r4.records.forEach(r => {
            console.log(r.toObject());
        });

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

debugQuery();
