/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import neo4j, { Driver } from 'neo4j-driver';

// No .env file found, using defaults from docker-compose.yml (adjusted for localhost)
const DATABASE_URL = 'postgresql://audituser:auditpass@localhost:5432/auditdb';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL,
        },
    },
});

// Neo4j Configuration
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4j_password_env_missing'; // Ensure this fails if env missing

const driver: Driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

async function reconcile() {
    console.log('Starting Graph Reconciliation...');
    const session = driver.session();

    try {
        // 1. Fetch all projects with assigned auditors from Postgres
        const projects = await prisma.project.findMany({
            where: {
                auditorId: { not: null }
            },
            select: {
                id: true,
                name: true,
                auditorId: true
            }
        });

        console.log(`Found ${projects.length} projects with auditors in Postgres.`);

        let missing = 0;
        let synced = 0;

        for (const p of projects) {
            if (!p.auditorId) continue;

            // 2. Check existence in Neo4j
            const result = await session.run(
                `
            MATCH(p: Project { id: $projectId })
MATCH(u: User { id: $auditorId })
MATCH(u) - [: ASSIGNED_TO] -> (p)
            RETURN p, u
    `,
                { projectId: p.id, auditorId: p.auditorId }
            );

            if (result.records.length === 0) {
                console.warn(`[MISSING] Project ${p.name} (${p.id}) -> Auditor ${p.auditorId} link missing in Graph.`);
                missing++;

                // Auto-fix (Optional - uncomment to enable)
                // await session.run(
                //     `
                //     MERGE (p:Project {id: $projectId})
                //     ON CREATE SET p.name = $projectName
                //     MERGE (u:User {id: $auditorId})
                //     MERGE (u)-[:ASSIGNED_TO]->(p)
                //     `,
                //     { projectId: p.id, auditorId: p.auditorId, projectName: p.name }
                // );
                // console.log(`[FIXED] Created link for ${p.name}`);
            } else {
                synced++;
            }
        }

        console.log('------------------------------------------------');
        console.log(`Reconciliation Complete.`);
        console.log(`Synced: ${synced}`);
        console.log(`Missing: ${missing}`);
        console.log('------------------------------------------------');

    } catch (error) {
        console.error('Reconciliation failed:', error);
    } finally {
        await session.close();
        await driver.close();
        await prisma.$disconnect();
    }
}

reconcile();
