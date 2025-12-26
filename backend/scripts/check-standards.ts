
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { disableLosslessIntegers: true });

async function check() {
    const session = driver.session();
    try {
        console.log('Checking Standards...');
        const res = await session.run(`
            MATCH (s:Standard) 
            OPTIONAL MATCH (c:Control)-[:BELONGS_TO]->(s)
            RETURN s.name, count(c) as controls
        `);

        console.log(`Found ${res.records.length} standards.`);
        res.records.forEach(r => {
            console.log(`- ${r.get('s.name')}: ${r.get('controls')} controls`);
        });

        if (res.records.length === 0) {
            console.log('WARNING: No standards found! You need to sync graph data.');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await session.close();
        await driver.close();
    }
}

check();
