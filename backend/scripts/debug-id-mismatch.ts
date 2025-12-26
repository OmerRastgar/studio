
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://neo4j:7687',
    neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
);

async function debugMismatch() {
    const session = driver.session();
    try {
        console.log('--- Debugging ID Mismatch ---');

        // 1. Get Customer from Postgres
        const customer = await prisma.user.findFirst({
            where: { role: 'customer' },
            include: { uploadedProjectEvidence: true }
        });

        if (!customer) {
            console.log('No customer found in Postgres.');
            return;
        }

        console.log(`Postgres Customer: ${customer.email} (${customer.id})`);
        console.log(`  Owned Evidence in PG: ${customer.uploadedProjectEvidence.length}`);

        // 2. Check Neo4j User Node
        console.log('Checking Neo4j for this ID...');
        const userNode = await session.run(`
            MATCH (u:User {id: $id}) 
            RETURN u.id, u.email, count{(u)-[:UPLOADED]->()} as evidenceCount
        `, { id: customer.id });

        if (userNode.records.length === 0) {
            console.log('  [CRITICAL] User node NOT FOUND in Neo4j with this ID.');
        } else {
            const r = userNode.records[0];
            console.log(`  Neo4j Node Found: ${r.get('u.email')} (${r.get('u.id')})`);
            console.log(`  Linked Evidence in Graph: ${r.get('evidenceCount')}`);
        }

        // 3. Find WHO owns the evidence in Neo4j
        console.log('Scanning all Evidence in Neo4j for owners...');
        const evidenceOwners = await session.run(`
            MATCH (u:User)-[:UPLOADED]->(e:Evidence)
            RETURN DISTINCT u.id as userId, u.email as email, count(e) as count
        `);

        if (evidenceOwners.records.length === 0) {
            console.log('  No evidence owners found in Neo4j.');
        } else {
            evidenceOwners.records.forEach(r => {
                const uid = r.get('userId');
                const email = r.get('email');
                const count = r.get('count');
                console.log(`  Owner: ${email || 'NoEmail'} (${uid}) - Has ${count} files`);
                console.log(`    Properties: ${JSON.stringify(r.toObject())}`); // Dump everything

                if (uid !== customer.id) {
                    console.log(`  [MISMATCH] Found Evidence Owner that is NOT the current customer!`);
                }
            });
        }

    } catch (error) {
        console.error(error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

debugMismatch();
