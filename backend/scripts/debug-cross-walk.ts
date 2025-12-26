
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
        console.log('--- Debugging Cross-Walk ---');

        // 1. Find users with evidence
        const r1 = await session.run(`MATCH (u:User)-[:UPLOADED]->(e:Evidence) RETURN DISTINCT u.id, u.email, count(e) as evidence_count`);
        if (r1.records.length === 0) {
            console.log('No users with evidence found.');
            return;
        }

        // New logic for checking fileName
        const allEvidenceFilesResult = await session.run(`MATCH (u:User)-[:UPLOADED]->(e:Evidence) RETURN DISTINCT e.fileName`);
        if (allEvidenceFilesResult.records.length === 0) {
            console.log('  No evidence files found in the database.');
        } else {
            const evidenceFiles = new Set<string>();
            allEvidenceFilesResult.records.forEach(r => {
                const fName = r.get('e.fileName');
                evidenceFiles.add(fName || 'NULL_FILENAME');
            });
            console.log(`  All Evidence Files: ${Array.from(evidenceFiles).join(', ')}`);
        }
        // End of new logic

        for (const rec of r1.records) {
            const email = rec.get('u.email');
            const uid = rec.get('u.id');
            const count = rec.get('evidence_count');
            console.log(`User ${email} (${uid}) has ${count} evidence items.`);

            // 2. Check tags for this user's evidence
            const r2 = await session.run(`
                MATCH (u:User {id: $uid})-[:UPLOADED]->(e:Evidence)-[:HAS_TAG]->(t:Tag)
                RETURN DISTINCT t.name, count(e) as evidenced_by
            `, { uid });

            console.log(`  > Linked Tags: ${r2.records.map(r => r.get('t.name') + '(' + r.get('evidenced_by') + ')').join(', ')}`);

            if (r2.records.length > 0) {
                // 3. Check if these tags link to OTHER standards
                const r3 = await session.run(`
                    MATCH (u:User {id: $uid})-[:UPLOADED]->(e:Evidence)-[:HAS_TAG]->(t:Tag)
                    MATCH (c:Control)-[:HAS_TAG]->(t)
                    MATCH (c)-[:BELONGS_TO]->(s:Standard)
                    RETURN DISTINCT s.name, count(DISTINCT c) as covered_controls
                `, { uid });

                console.log(`  > Projected Coverage:`);
                r3.records.forEach(r => {
                    console.log(`    - ${r.get('s.name')}: ${r.get('covered_controls')} controls`);
                });
            } else {
                console.log(`  > WARNING: Evidence has NO tags.`);
            }
        }

    } catch (e) { console.error(e); }
    finally { await session.close(); await driver.close(); }
}
run();
