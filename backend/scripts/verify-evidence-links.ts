
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
);

async function verifyLinks() {
    const session = driver.session();
    try {
        console.log('--- Evidence Link Verification ---');

        const result = await session.run(`
            MATCH (e:Evidence)-[r]->(n)
            RETURN type(r) as relType, labels(n) as targetLabels, count(*) as count
        `);

        result.records.forEach(r => {
            console.log(`Evidence -[:${r.get('relType')}]-> ${JSON.stringify(r.get('targetLabels'))}: ${r.get('count')}`);
        });

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
    }
}

verifyLinks();
