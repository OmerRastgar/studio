
import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';
dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { disableLosslessIntegers: true });

async function run() {
    const session = driver.session();
    try {
        console.log('--- Checking Framework Tags ---');

        const r = await session.run(`
            MATCH (s:Standard)
            OPTIONAL MATCH (s)<-[:BELONGS_TO]-(c:Control)-[:HAS_TAG]->(t:Tag)
            RETURN s.name, count(DISTINCT c) as controls, count(DISTINCT t) as tags, collect(DISTINCT t.name)[..10] as sample_tags
        `);

        r.records.forEach(rec => {
            console.log(`Framework: ${rec.get('s.name')}`);
            console.log(`  Controls: ${rec.get('controls')}`);
            console.log(`  Unique Tags: ${rec.get('tags')}`);
            console.log(`  Sample Tags: ${rec.get('sample_tags')}`);
            console.log('--------------------------------');
        });

    } catch (e) { console.error(e); }
    finally { await session.close(); await driver.close(); }
}
run();
