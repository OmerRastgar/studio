import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';

// Demo Users Configuration
const DEMO_USERS = [
    { email: 'manager@example.com', name: 'Demo Manager', role: 'manager', password: 'cybergaarManager1' },
    { email: 'auditor@example.com', name: 'Demo Auditor', role: 'auditor', password: 'cybergaarAuditor1' },
    { email: 'reviewer@example.com', name: 'Demo Reviewer', role: 'auditor', password: 'cybergaarAuditor2' }, // Reviewer is technically an auditor role
];

async function ensureKratosIdentity(user: typeof DEMO_USERS[0]) {
    try {
        const response = await axios.post(`${KRATOS_ADMIN_URL}/admin/identities`, {
            schema_id: 'default',
            state: 'active',
            traits: { email: user.email, name: user.name, role: user.role },
            credentials: { password: { config: { password: user.password } } }
        });
        return response.data.id;
    } catch (error: any) {
        if (error.response?.status === 409) {
            const existing = await axios.get(`${KRATOS_ADMIN_URL}/admin/identities?credentials_identifier=${user.email}`);
            if (Array.isArray(existing.data) && existing.data.length > 0) {
                return existing.data[0].id;
            }
            throw new Error(`User ${user.email} exists (409) but could not be retrieved via Admin API.`);
        }
        throw error;
    }
}

export async function seedDemo() {
    console.log('🧪 Seeding Demo Environment...');

    const userMap = new Map<string, string>(); // Email -> ID

    // 1. Create Demo Users (Kratos + DB)
    for (const u of DEMO_USERS) {
        const id = await ensureKratosIdentity(u);
        const hashedPassword = await bcrypt.hash(u.password, 10);

        await prisma.user.upsert({
            where: { email: u.email },
            update: { id, role: u.role as any, password: hashedPassword },
            create: {
                id,
                email: u.email,
                name: u.name,
                role: u.role as any,
                password: hashedPassword,
                status: 'Active',
                avatarUrl: `https://ui-avatars.com/api/?name=${u.name.replace(' ', '+')}`,
                isNewUser: false // Demo accounts are not "new"
            }
        });
        userMap.set(u.email, id);
        console.log(`   ✅ Synced ${u.email}`);
    }

    const managerId = userMap.get('manager@example.com')!;
    const auditorId = userMap.get('auditor@example.com')!;
    const reviewerId = userMap.get('reviewer@example.com')!;

    // 2. Setup Hierarchy
    // Link Auditors to Manager
    await prisma.user.update({
        where: { id: auditorId },
        data: { managerId }
    });
    await prisma.user.update({
        where: { id: reviewerId },
        data: { managerId }
    });
    // Ensure Auditor Profiles exist
    await prisma.auditor.upsert({
        where: { userId: auditorId },
        update: {},
        create: { id: auditorId, userId: auditorId, certifications: ['CISA', 'CISSP'], experience: '5 Years' }
    });
    await prisma.auditor.upsert({
        where: { userId: reviewerId },
        update: {},
        create: { id: reviewerId, userId: reviewerId, certifications: ['Lead Auditor', 'ISO 27001 LA'], experience: '10 Years' }
    });


    // 3. Create/Reset "Shared Demo Project"
    const DEMO_PROJECT_NAME = 'ISO 27001 Master Demo';

    // Check if framework exists
    let framework = await prisma.framework.findUnique({ where: { name: 'ISO 27001' } });
    if (!framework) {
        framework = await prisma.framework.create({ data: { name: 'ISO 27001', description: 'Information Security Management' } });
    }

    const project = await prisma.project.upsert({
        where: { id: 'demo-project-master-id' },
        update: {
            auditorId,
            reviewerAuditorId: reviewerId,
            status: 'approved'
        },
        create: {
            id: 'demo-project-master-id',
            name: DEMO_PROJECT_NAME,
            customerName: 'Demo Organization', // Placeholder
            customerId: null,
            auditorId: auditorId,
            reviewerAuditorId: reviewerId,
            frameworkId: framework.id,
            status: 'approved',
            description: 'A fully populated standard ISO 27001 demo environment.',
            scope: 'Entire Organization',
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
        }
    });

    console.log(`   ✅ Project "${project.name}" ready (ID: ${project.id})`);

    // 4. Seed Domain Data (Findings, CASB, Agents)
    // Findings
    const countFindings = await prisma.finding.count();
    if (countFindings === 0) {
        console.log('   🔸 Seeding Findings...');
        // Placeholder for finding seeding
    }

    // CASB
    const countCASB = await prisma.cASBIntegration.count();
    if (countCASB === 0) {
        console.log('   🔸 Seeding CASB...');
        await prisma.cASBIntegration.createMany({
            data: [
                { name: 'Demo M365', type: 'saas_office365', status: 'active', authType: 'oauth2', createdById: managerId },
                { name: 'Demo AWS', type: 'saas_aws', status: 'active', authType: 'api_key', createdById: managerId }
            ]
        });
    }

    // Agents
    const countAgents = await prisma.agent.count();
    if (countAgents === 0) {
        console.log('   🔸 Seeding Agents...');
        await prisma.agent.createMany({
            data: [
                { id: 'agent-demo-01', name: 'CEO-LAPTOP', platform: 'windows', status: 'Active', projectId: project.id },
                { id: 'agent-demo-02', name: 'WEB-SERVER-PROD', platform: 'linux', status: 'Active', projectId: project.id }
            ]
        });
    }

    // 5. Upload Evidence to MinIO (Bulk)
    console.log('   🔸 Seeding Evidence...');
    const Client = require('minio').Client;
    const { neo4jSyncQueue } = require('../lib/queue');

    const minioClient = new Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY
    });

    const bucketName = process.env.MINIO_BUCKET || 'evidence';
    const filesDir = path.join(__dirname, 'files');

    try {
        // Ensure bucket
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        // Sync Project Node first
        try {
            await neo4jSyncQueue.add('project_updated', {
                id: project.id,
                name: project.name,
                managerId,
                customerId: null,
                eventId: `SEED-${Date.now()}`
            });
        } catch (e) { console.warn('Neo4j project sync warn'); }

        if (fs.existsSync(filesDir)) {
            const files = fs.readdirSync(filesDir);
            console.log(`      found ${files.length} files to upload.`);

            for (const file of files) {
                const filePath = path.join(filesDir, file);
                const fileStats = fs.statSync(filePath);

                if (fileStats.isFile()) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const objectName = `demo/${file}`;

                    await minioClient.putObject(bucketName, objectName, fileBuffer);
                    console.log(`      ✅ Uploaded ${file}`);

                    // Create Tags based on filename
                    const tagsList = ['ISO 27001', 'Demo'];
                    if (file.toLowerCase().includes('policy')) tagsList.push('Policy');
                    if (file.toLowerCase().includes('procedure')) tagsList.push('Procedure');

                    // Create Evidence Record
                    const evidence = await prisma.evidence.create({
                        data: {
                            projectId: project.id,
                            fileName: file,
                            fileUrl: `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || '9000'}/${bucketName}/${objectName}`,
                            type: 'document',
                            uploadedById: managerId,
                            tags: {
                                connectOrCreate: tagsList.map(t => ({
                                    where: { name: t },
                                    create: { name: t }
                                }))
                            }
                        }
                    });

                    // Sync Evidence to Neo4j
                    try {
                        await neo4jSyncQueue.add('evidence_uploaded', {
                            id: evidence.id,
                            projectId: project.id,
                            fileName: evidence.fileName,
                            tags: tagsList,
                            uploadedById: managerId,
                            eventId: `SEED-${Date.now()}`
                        });
                    } catch (err) {
                        // ignore redis errors during seed
                    }
                }
            }
        } else {
            console.warn(`      ⚠️  Files directory not found: ${filesDir}`);
        }
    } catch (e) {
        console.error('      ❌ MinIO/Evidence error:', e);
    }

    console.log('   ✅ Domain data seeded');
}
