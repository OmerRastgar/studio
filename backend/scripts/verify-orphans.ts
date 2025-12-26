
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
);

async function checkOrphans() {
    const session = driver.session();
    try {
        console.log('--- Checking for Orphaned Graph Data ---');

        // Check 1: Evidence without Project link
        const orphanProject = await session.run(`
            MATCH (e:Evidence)
            WHERE NOT (e)-[:BELONGS_TO]->(:Project)
            RETURN count(e) as count, collect(e.id) as ids
        `);
        const projectOrphans = orphanProject.records[0].get('count').toNumber();
        console.log(`Evidence missing Project link: ${projectOrphans}`);
        if (projectOrphans > 0) console.log(`IDs: ${JSON.stringify(orphanProject.records[0].get('ids'))}`);

        // Check 2: Evidence without Control link
        // Note: Some evidence might genuinely not be linked to a control? 
        // But usually in this system they are.
        const orphanControl = await session.run(`
            MATCH (e:Evidence)
            WHERE NOT (e)-[:PROVES]->(:Control)
            RETURN count(e) as count
        `);
        console.log(`Evidence missing Control link: ${orphanControl.records[0].get('count').toNumber()}`);

        // Check 3: Evidence without Uploader
        const orphanUploader = await session.run(`
            MATCH (e:Evidence)
            WHERE NOT (:User)-[:UPLOADED]->(e)
            RETURN count(e) as count
        `);
        console.log(`Evidence missing Uploader link: ${orphanUploader.records[0].get('count').toNumber()}`);

        // Check 4: Total Evidence Count
        const total = await session.run(`MATCH (e:Evidence) RETURN count(e) as count`);
        console.log(`Total Evidence Nodes: ${total.records[0].get('count').toNumber()}`);

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
    }
}

checkOrphans();
