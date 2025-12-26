
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
);

async function checkProperties() {
    const session = driver.session();
    try {
        console.log('--- Checking Node Properties ---');

        // Check Evidence
        const ev = await session.run(`MATCH (e:Evidence) RETURN e LIMIT 1`);
        if (ev.records.length > 0) {
            console.log('Evidence Node:', JSON.stringify(ev.records[0].get('e').properties));
        } else {
            console.log('No Evidence found');
        }

        // Check Control
        const ctrl = await session.run(`MATCH (c:Control) RETURN c LIMIT 1`);
        if (ctrl.records.length > 0) {
            console.log('Control Node:', JSON.stringify(ctrl.records[0].get('c').properties));
        } else {
            console.log('No Control found');
        }

        // Check Tag
        const tag = await session.run(`MATCH (t:Tag) RETURN t LIMIT 1`);
        if (tag.records.length > 0) {
            console.log('Tag Node:', JSON.stringify(tag.records[0].get('t').properties));
        } else {
            console.log('No Tag found');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
    }
}

checkProperties();
