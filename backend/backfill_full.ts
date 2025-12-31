
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import neo4j from 'neo4j-driver';

const prisma = new PrismaClient();

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

async function backfillFullGraph() {
    console.log('--- STARTING FULL GRAPH BACKFILL ---');
    const session = driver.session();

    try {
        // 1. Fetch All Frameworks
        const frameworks = await prisma.framework.findMany({
            include: {
                controls: {
                    include: { tags: true }
                }
            }
        });
        console.log(`Found ${frameworks.length} Frameworks in Postgres.`);

        for (const fw of frameworks) {
            console.log(`\nSyncing Framework: ${fw.name} (${fw.controls.length} controls)...`);

            // Sync Standard Node
            await session.run(`
                MERGE (s:Standard {id: $id})
                SET s.name = $name, s.updatedAt = datetime()
            `, { id: fw.id, name: fw.name });

            // Sync Controls & Tags
            let syncedControls = 0;
            for (const control of fw.controls) {
                const tagNames = control.tags.map(t => t.name);

                // Transaction for each control to keep memory low
                await session.run(`
                    MERGE (c:Control {id: $controlId})
                    SET c.code = $code, 
                        c.title = $title, 
                        c.description = $description,
                        c.category = $category,
                        c.updatedAt = datetime()

                    // Link to Standard
                    WITH c
                    MERGE (s:Standard {id: $frameworkId})
                    MERGE (c)-[:BELONGS_TO]->(s)

                    // Link Tags
                    WITH c
                    UNWIND $tags as tagName
                    MERGE (t:Tag {id: tagName})
                    ON CREATE SET t.name = tagName
                    MERGE (c)-[:HAS_TAG]->(t)
                `, {
                    controlId: control.id,
                    frameworkId: fw.id,
                    code: control.code,
                    title: control.title,
                    description: control.description,
                    category: control.category,
                    tags: tagNames
                });
                syncedControls++;
                if (syncedControls % 50 === 0) process.stdout.write('.');
            }
            console.log(`\n   ✅ Synced ${syncedControls} controls for ${fw.name}`);
        }

        console.log('\n--- BACKFILL COMPLETE ---');

    } catch (error) {
        console.error('Backfill Error:', error);
    } finally {
        await session.close();
        await prisma.$disconnect();
        await driver.close();
    }
}

backfillFullGraph();
