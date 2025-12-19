
import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'auditgraph123';

const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

async function verifyTags() {
    const session = driver.session();
    try {
        console.log('Verifying Tag-Based Linking...');

        // Query: Find paths (c:Control)-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(e:Evidence)
        const result = await session.run(`
            MATCH (c:Control)-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(e:Evidence)
            RETURN c.code as controlCode, t.name as tagName, e.fileName as evidenceFile
            LIMIT 10
        `);

        if (result.records.length === 0) {
            console.log('No Evidence-Control links found via Tags. (This might be expected if no evidence shares tags yet).');

            // Check if we have tags at all
            const countTags = await session.run('MATCH (t:Tag) RETURN count(t) as count');
            const countControls = await session.run('MATCH (c:Control) RETURN count(c) as count');
            const countEvidence = await session.run('MATCH (e:Evidence) RETURN count(e) as count');

            console.log(`Debug Counts: Tags=${countTags.records[0].get('count')}, Controls=${countControls.records[0].get('count')}, Evidence=${countEvidence.records[0].get('count')}`);
        } else {
            console.log(`Found ${result.records.length} links via Tags:`);
            result.records.forEach(record => {
                console.log(`- Control [${record.get('controlCode')}] <--(Tag: ${record.get('tagName')})--> Evidence [${record.get('evidenceFile')}]`);
            });
            console.log('VERIFICATION SUCCESSFUL: Graph structure matches Tag-based architecture.');
        }

    } catch (error) {
        console.error('Verification Failed:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

verifyTags();
