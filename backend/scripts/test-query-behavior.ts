
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
        const userId = 'non-existent-user-id';
        const query = `
                MATCH (total_c:Control)-[:BELONGS_TO]->(s:Standard)
                WITH s, count(DISTINCT total_c) as total
                
                // Find controls covered by User's Evidence via Tags (if any)
                OPTIONAL MATCH (u:User {id: $userId})-[:UPLOADED]->(e:Evidence)-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(c:Control)-[:BELONGS_TO]->(s)
                
                // Aggregate
                RETURN s.id as id, s.name as name, count(DISTINCT c) as covered, total
                ORDER BY covered DESC
            `;

        console.log('Running query with non-existent user...');
        const result = await session.run(query, { userId });

        console.log(`Got ${result.records.length} records.`);
        result.records.forEach(r => {
            console.log(r.get('name'), r.get('covered'), '/', r.get('total'));
        });

    } catch (e) { console.error(e); }
    finally { await session.close(); await driver.close(); }
}
run();
