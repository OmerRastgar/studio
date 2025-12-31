
import 'dotenv/config';
import neo4j from 'neo4j-driver';

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

async function debugProjection() {
    const session = driver.session();
    try {
        console.log('--- DATA DUMP ---');

        // 1. Get Tags on Demo Evidence
        const demoEvidence = await session.run(`
            MATCH (p:Project {id: 'demo-project-master-id'})<-[:BELONGS_TO]-(e:Evidence)-[:HAS_TAG]->(t:Tag)
            RETURN distinct t.name as tag, e.fileName as file
            LIMIT 10
        `);
        console.log('\nDemo Evidence Tags (Sample):');
        demoEvidence.records.forEach(r => console.log(` - [${r.get('tag')}] (on ${r.get('file')})`));

        // 2. Get All Standards
        const standards = await session.run(`MATCH (s:Standard) RETURN s.id, s.name`);
        console.log('\nStandards in Graph:');
        standards.records.forEach(r => console.log(` - ${r.get('s.name')} (${r.get('s.id')})`));

        // 3. For each Standard, Check Tag Overlap
        for (const stdRow of standards.records) {
            const stdId = stdRow.get('s.id');
            const stdName = stdRow.get('s.name');

            console.log(`\nChecking Overlap for: ${stdName}`);

            // Get Tags on this Standard's Controls
            const stdTags = await session.run(`
                MATCH (s:Standard {id: $stdId})<-[:BELONGS_TO]-(c:Control)-[:HAS_TAG]->(t:Tag)
                RETURN distinct t.name as tag
                LIMIT 10
            `, { stdId });

            const tags = stdTags.records.map(r => r.get('tag'));
            console.log(`   Control Tags found: [${tags.join(', ')}]`);

            // Check actual intersection logic
            const projectionCheck = await session.run(`
                MATCH (p:Project {id: 'demo-project-master-id'})<-[:BELONGS_TO]-(e:Evidence)-[:HAS_TAG]->(t:Tag)
                WITH distinct t
                MATCH (t)<-[:HAS_TAG]-(c:Control)-[:BELONGS_TO]->(s:Standard {id: $stdId})
                RETURN count(distinct c) as matched_controls, collect(distinct t.name) as shared_tags
            `, { stdId });

            const match = projectionCheck.records[0];
            console.log(`   >> Projected Matches: ${match.get('matched_controls')} Controls`);
            console.log(`   >> Shared Tags: [${match.get('shared_tags').join(', ')}]`);
        }

    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        await session.close();
        await driver.close();
    }
}

debugProjection();
