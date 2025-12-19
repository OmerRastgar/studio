import { PrismaClient } from '@prisma/client';
import { GraphService } from '../src/services/graph.service';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars (adjust path if needed to point to root .env)
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Fallback defaults for dev
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

// Hardcode DB URL for localhost script execution (Docker internal URL won't work from host unless port mapped)
const DATABASE_URL = 'postgresql://audituser:auditpass@localhost:5432/auditdb';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL,
        },
    },
});

async function backfill() {
    console.log('Starting Graph Backfill...');

    // 1. Users
    console.log('--- Syncing Users ---');
    const users = await prisma.user.findMany();
    for (const user of users) {
        if (user.managerId) {
            await GraphService.assignManager(user.id, user.managerId);
        }
        if (user.linkedCustomerId && user.role === 'compliance') {
            await GraphService.linkComplianceToCustomer(user.id, user.linkedCustomerId);
        }
    }
    console.log(`Processed ${users.length} users.`);

    // 2. Projects
    console.log('--- Syncing Projects ---');
    const projects = await prisma.project.findMany();
    for (const project of projects) {
        if (project.auditorId) {
            await GraphService.assignAuditor(project.id, project.auditorId);
            // If project is pending/open, maybe create audit request? 
            // For now, implicit link via assignAuditor is key.
        }
        if (project.reviewerAuditorId) {
            await GraphService.assignReviewer(project.id, project.reviewerAuditorId);
        }
        // Report implicit issues if any?
    }
    console.log(`Processed ${projects.length} projects.`);

    // 3. Controls & Standards (Frameworks)
    console.log('--- Syncing Controls ---');
    const controls = await prisma.control.findMany();
    for (const control of controls) {
        if (control.frameworkId) {
            await GraphService.linkControlToStandard(control.id, control.frameworkId);
        }
        // Tags?
        if (control.tags && control.tags.length > 0) {
            // We need tag IDs. If tags are just strings, maybe GraphService expects strings or specific Tag nodes?
            // GraphService.linkControlToTag(controlId, tagId). 
            // If tags are strings in Postgres, we might need to treat them as IDs or create Tag nodes first.
            // For simplicity, skip tags unless we have a Tag entity in Postgres (we don't appear to, just string arrays).
            // We'll skip tags for now to avoid ID mismatches.
        }
    }
    console.log(`Processed ${controls.length} controls.`);

    // 4. Evidence
    console.log('--- Syncing Evidence ---');
    const evidenceList = await prisma.evidence.findMany({
        include: {
            controls: true // Many-to-many implicit? Or ProjectControl relation?
        }
    });

    // Note: Schema says `Evidence` has `controls ProjectControl[]`. 
    // But `ProjectControl` links to `Control`.
    // We want to link Evidence -> Control (Master Control ID or Project Control ID?).
    // GraphService.linkEvidenceToControl(evidenceId, controlId). 
    // Usually we link to the abstract Control ID to show "Evidence for Access Control".

    for (const evidence of evidenceList) {
        // Link to Uploader
        if (evidence.uploadedById) {
            const u = users.find(x => x.id === evidence.uploadedById);
            if (u) {
                await GraphService.linkEvidenceUploader(evidence.id, evidence.uploadedById, u.role);
            }
        }

        // Link to Controls
        if (evidence.controls && evidence.controls.length > 0) {
            for (const pc of evidence.controls) {
                // pc is ProjectControl, which has controlId.
                // We likely want to link Evidence to the Master Control (pc.controlId) in the graph 
                // so we can see "All evidence for ISO-27001-A.9".
                await GraphService.linkEvidenceToControl(evidence.id, pc.controlId);
            }
        }
    }
    console.log(`Processed ${evidenceList.length} evidence items.`);

    // 5. Issues
    console.log('--- Syncing Issues ---');
    const issues = await prisma.projectIssue.findMany();
    for (const issue of issues) {
        // GraphService.reportIssue(customerId, managerId, issue).
        // identifying manager is tricky if not stored on Issue.
        // Issue has customerId. Customer has managerId (via User.managerId).
        const customer = users.find(u => u.id === issue.customerId);
        if (customer && customer.managerId) {
            await GraphService.reportIssue(issue.customerId, customer.managerId, {
                id: issue.id,
                title: issue.title,
                status: issue.status
            });
        }
    }
    console.log(`Processed ${issues.length} issues.`);

    console.log('Backfill events queued. Workers will process them asynchronously.');
}

backfill()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        setTimeout(() => process.exit(0), 5000); // Wait for BullMQ flush
    });
