
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

async function verifyGraph() {
    const session = driver.session();
    try {
        console.log('--- Graph Data Verification ---');

        // Count Nodes by Label
        const nodesResult = await session.run(`
            MATCH (n) 
            RETURN labels(n) as labels, count(n) as count 
            ORDER BY count DESC
        `);
        console.log('\nNode Counts:');
        nodesResult.records.forEach(r => {
            console.log(`${JSON.stringify(r.get('labels'))}: ${r.get('count')}`);
        });

        // Count Relationships by Type
        const relsResult = await session.run(`
            MATCH ()-[r]->() 
            RETURN type(r) as type, count(r) as count 
            ORDER BY count DESC
        `);
        console.log('\nRelationship Counts:');
        relsResult.records.forEach(r => {
            console.log(`${r.get('type')}: ${r.get('count')}`);
        });

        // specific check for Evidence
        const evidenceResult = await session.run(`
            MATCH (e:Evidence) 
            RETURN count(e) as count
        `);
        const evidenceCount = evidenceResult.records[0].get('count').toNumber();
        console.log(`\nTotal Evidence Nodes: ${evidenceCount}`);

        if (evidenceCount > 0) {
            // Check connections
            const evidenceRels = await session.run(`
                MATCH (e:Evidence)-[r]->(other)
                RETURN type(r) as type, labels(other) as otherLabels, count(*) as count
            `);
            console.log('Evidence Connections:');
            evidenceRels.records.forEach(r => {
                console.log(`(Evidence)-[:${r.get('type')}]->(${JSON.stringify(r.get('otherLabels'))}): ${r.get('count')}`);
            });
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

verifyGraph();
