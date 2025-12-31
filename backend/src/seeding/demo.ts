import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { neo4jSyncQueue } from '../lib/queue';

const prisma = new PrismaClient();
const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';

// Demo Users Configuration
const DEMO_USERS = [
    { email: 'manager@example.com', name: 'Demo Manager', role: 'manager', password: 'cybergaarManager1' },
    { email: 'auditor@example.com', name: 'Demo Auditor', role: 'auditor', password: 'cybergaarAuditor1' },
    { email: 'reviewer@example.com', name: 'Demo Reviewer', role: 'auditor', password: 'cybergaarAuditor2' }, // Reviewer is technically an auditor role
];

// Cache for Control Tags: Code -> Tags[]
const codeToTags = new Map<string, string[]>();

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

        // Sync User to Neo4j
        try {
            await neo4jSyncQueue.add('user_created', {
                eventId: `SEED-${Date.now()}`,
                payload: {
                    id,
                    email: u.email,
                    name: u.name,
                    role: u.role
                }
            });
        } catch (e) {
            // ignore
        }
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

    // Sync Framework as Standard to Neo4j
    try {
        await neo4jSyncQueue.add('standard_created', {
            eventId: `SEED-${Date.now()}`,
            payload: {
                id: framework.id,
                name: framework.name
            }
        });
    } catch (e) {
        // ignore
    }



    // Seed Controls from CSV
    const csvPath = path.join(__dirname, 'data', 'ISO27001.csv');
    if (fs.existsSync(csvPath)) {
        console.log('   🔸 Seeding ISO 27001 Controls...');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const rows = csvContent.split('\n').slice(1); // Skip header

        for (const row of rows) {
            // Robust parsing for fully quoted CSV: "col1","col2","col3"...
            // Remove leading/trailing quotes and newlines/returns
            const cleanRow = row.trim().replace(/^"|"$/g, '');
            if (!cleanRow) continue;

            const cols = cleanRow.split('","');
            if (cols.length < 5) continue;

            const code = cols[0].trim();
            const title = cols[1].trim();
            const description = cols[2].trim();
            const category = cols[3].trim();
            const tagsRaw = cols[4].trim();

            // Parse tags (semicolon separated in CSV: "policy;governance")
            const tagNames = tagsRaw ? tagsRaw.split(';').map(t => t.trim()).filter(t => t.length > 0) : [];

            // Debug Log for Tags
            if (code === 'A.5.1' || code === 'A.8.20') {
                console.log(`   🐛 DEBUG: Parsed ${code} tags: [${tagNames.join(', ')}] (Raw: "${tagsRaw}")`);
            }

            if (!code || !title) continue;

            const control = await prisma.control.upsert({
                where: { frameworkId_code: { frameworkId: framework.id, code } },
                update: {
                    title,
                    description,
                    category,
                    tags: {
                        set: [], // Clear existing to overwrite
                        connectOrCreate: tagNames.map(t => ({
                            where: { name: t },
                            create: { name: t }
                        }))
                    }
                },
                create: {
                    frameworkId: framework.id,
                    code,
                    title,
                    description,
                    category,
                    tags: {
                        connectOrCreate: tagNames.map(t => ({
                            where: { name: t },
                            create: { name: t }
                        }))
                    }
                }
            });

            // Sync Control to Neo4j
            try {
                await neo4jSyncQueue.add('control_updated', {
                    eventId: `SEED-${Date.now()}`,
                    payload: {
                        id: control.id,
                        frameworkId: framework.id,
                        code: control.code,
                        title: control.title,
                        description: control.description,
                        category: control.category,
                        tags: tagNames
                    }
                });

                // Link to Standard (Framework)
                await neo4jSyncQueue.add('link_control_to_standard', {
                    eventId: `SEED-${Date.now()}`,
                    payload: {
                        controlId: control.id,
                        standardId: framework.id
                    }
                });
            } catch (error) {
                // ignore
            }
            // Cache tags for later evidence linking
            codeToTags.set(code, tagNames);
        }
    }

    const project = await prisma.project.upsert({
        where: { id: 'demo-project-master-id' },
        update: {
            auditorId,
            reviewerAuditorId: reviewerId,
            status: 'approved',
            customerName: 'PaperWorks Online Ltd.',
            description: `PaperWorks Online Ltd. – a fictional small e-commerce stationery retailer. Address: 123 Stationery Ave, Dublin, Ireland.\n\nMission Statement: “Deliver high-quality, sustainable paper products to customers with convenience and excellent service.”\n\nBusiness Description: PaperWorks sells paper and stationery via an online store with e-commerce checkout. The site collects customer data and processes credit card payments.`,
            scope: 'Entire Organization (PaperWorks Online Ltd.) - EU Customers (GDPR applies)'
        },
        create: {
            id: 'demo-project-master-id',
            name: DEMO_PROJECT_NAME,
            customerName: 'PaperWorks Online Ltd.',
            customerId: null,
            auditorId: auditorId,
            reviewerAuditorId: reviewerId,
            frameworkId: framework.id,
            status: 'approved',
            description: `PaperWorks Online Ltd. – a fictional small e-commerce stationery retailer. Address: 123 Stationery Ave, Dublin, Ireland.\n\nMission Statement: “Deliver high-quality, sustainable paper products to customers with convenience and excellent service.”\n\nBusiness Description: PaperWorks sells paper and stationery via an online store with e-commerce checkout. The site collects customer data and processes credit card payments.`,
            scope: 'Entire Organization (PaperWorks Online Ltd.) - EU Customers (GDPR applies)',
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            dueDate: new Date(new Date().setMonth(new Date().getMonth() + 3))
        }
    });

    // Link Controls to Project (ProjectControl)
    // Map Code -> ProjectControlId for faster lookup
    const codeToPCId = new Map<string, string>();

    const controls = await prisma.control.findMany({
        where: { frameworkId: framework.id },
        include: { tags: true } // Fetch tags to populate cache
    });

    if (controls.length > 0) {
        console.log(`   🔸 Linking ${controls.length} controls to project...`);
        for (const control of controls) {
            // Populate/Refresh codeToTags map from DB (robust against CSV skip)
            let tagNames: string[] = [];
            if (control.tags && control.tags.length > 0) {
                tagNames = control.tags.map(t => t.name);
                codeToTags.set(control.code, tagNames);
            }

            // Ensure Graph is synced (Idempotency)
            try {
                // Ensure Control Node Exists
                await neo4jSyncQueue.add('control_updated', {
                    eventId: `SEED-${Date.now()}`,
                    payload: {
                        id: control.id,
                        frameworkId: framework.id,
                        code: control.code,
                        title: control.title,
                        description: control.description,
                        category: control.category,
                        tags: tagNames
                    }
                });

                // Link to Standard (Framework)
                await neo4jSyncQueue.add('link_control_to_standard', {
                    eventId: `SEED-${Date.now()}`,
                    payload: {
                        controlId: control.id,
                        standardId: framework.id
                    }
                });
            } catch (error) {
                // ignore
            }

            // Generate random progress between 80 and 100 for a "mostly complete" feel
            const randomProgress = Math.floor(Math.random() * (100 - 80 + 1)) + 80;

            const pc = await prisma.projectControl.upsert({
                where: { projectId_controlId: { projectId: project.id, controlId: control.id } },
                update: {
                    progress: randomProgress // Enforce progress on re-seed
                },
                create: {
                    projectId: project.id,
                    controlId: control.id,
                    progress: randomProgress,
                    evidenceCount: 0
                }
            });
            codeToPCId.set(control.code, pc.id);
        }
    }

    console.log(`   ✅ Project "${project.name}" ready (ID: ${project.id})`);

    // 4. Seed Domain Data (Findings, CASB, Agents)
    // Findings
    const countFindings = await prisma.finding.count();
    if (countFindings === 0) {
        console.log('   🔸 Seeding Findings (Password Complexity)...');

        const findingsData = [
            { id: 'FIND-001', user: "dwight@dundermifflin.com", name: "Dwight (Admin)", description: 'Password "SchruteFarms123" has low complexity (common pattern, no special chars).', severity: "medium", evidence: "Hash analysis shows entropy < 50 bits; common farm reference.", remediation: "Enforce 12+ chars, mix case/symbols; rotate immediately." },
            { id: 'FIND-002', user: "michael@dundermifflin.com", name: "Michael (Exec)", description: 'Password "ThatsWhatSheSaid!" is dictionary-based with low complexity.', severity: "high", evidence: "Easily guessable phrase; failed brute-force simulation in 10 attempts.", remediation: "Implement MFA; train on passphrase best practices." },
            { id: 'FIND-003', user: "ryan@dundermifflin.com", name: "Ryan (Dev)", description: 'Password "Temp123" extremely low complexity (short, sequential numbers).', severity: "critical", evidence: "Dev account; exposed in logs; entropy ~20 bits.", remediation: "Lock account; enforce password manager usage." },
            { id: 'FIND-004', user: "pam@dundermifflin.com", name: "Pam (User)", description: 'Password "BeeslyArt456" moderate but low complexity (predictable personal ref).', severity: "low", evidence: "Includes name variant; passes basic checks but weak against targeted attacks.", remediation: "Suggest random generation; annual audit." },
            { id: 'FIND-005', user: "angela@dundermifflin.com", name: "Angela (Finance)", description: 'Password "CatLover789" low complexity (common hobby word + numbers).', severity: "medium", evidence: "Finance scope; PCI risk if breached.", remediation: "Add complexity rules in policy; monitor login attempts." },
            { id: 'FIND-006', user: "kevin@dundermifflin.com", name: "Kevin (Accounting)", description: 'Password "ChiliRecipe1" very low complexity (simple word + number).', severity: "high", evidence: "High mishandling risk; evidence from reset logs.", remediation: "Force reset; provide training on password hygiene." },
            { id: 'FIND-007', user: "toby@dundermifflin.com", name: "Toby (HR)", description: 'Password "FlendersonHR" low complexity (surname + role, no variation).', severity: "medium", evidence: "Privacy role; weak against social engineering.", remediation: "Enable auto-expiration; integrate with SSO." }
        ];

        for (const f of findingsData) {
            await prisma.finding.create({
                data: {
                    title: `Low Password Complexity: ${f.name}`,
                    description: `${f.description}\n\nEvidence: ${f.evidence}`,
                    severity: f.severity as any,
                    category: 'vulnerability',
                    type: 'infrastructure_scan',
                    status: 'open',
                    affectedUser: f.user,

                    remediationSteps: f.remediation,
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date()
                }
            });
        }
    }

    // CASB & Findings
    // Always seed CASB for demo
    console.log('   🔸 Seeding CASB & Findings...');

    // Cleanup old placeholders if they exist
    await prisma.cASBIntegration.deleteMany({
        where: { name: { in: ['Demo M365', 'Demo AWS'] } }
    });

    // 1. Create Integrations
    const gWorkspace = await prisma.cASBIntegration.create({
        data: {
            name: 'Dunder Mifflin Google Workspace',
            type: 'saas_google_workspace',
            status: 'active',
            authType: 'oauth2',
            createdById: managerId,
            vendor: 'Google'
        }
    });

    await prisma.cASBIntegration.create({
        data: {
            name: 'PaperWorks AWS Prod',
            type: 'saas_aws',
            status: 'active',
            authType: 'api_key',
            createdById: managerId,
            vendor: 'AWS'
        }
    });

    // 2. Seed Findings (CASB Logs)
    const casbData = [
        { user: "dwight@dundermifflin.com", action: "File Upload", service: "Google Drive", volume: "5 MB", risk: "medium", details: "Uploaded customer order spreadsheet; shared with team.", compliance: "GDPR: Data classification needed; potential PII exposure.", category: "data_leak" },
        { user: "michael@dundermifflin.com", action: "Email Send", service: "Gmail", volume: "2 KB", risk: "low", details: "Sent policy approval email without attachments.", compliance: "No issues; policy signed blindly.", category: "policy_violation" },
        { user: "ryan@dundermifflin.com", action: "App Integration", service: "Google Workspace API", volume: "10 KB", risk: "high", details: "Integrated insecure third-party app; API keys exposed.", compliance: "Flagged: Reckless integration; audit required.", category: "misconfiguration" },
        { user: "pam@dundermifflin.com", action: "Document Edit", service: "Google Docs", volume: "1 MB", risk: "low", details: "Edited inventory list; no external shares.", compliance: "Standard user activity; compliant.", category: "other" },
        { user: "angela@dundermifflin.com", action: "File Download", service: "Google Drive", volume: "3 MB", risk: "medium", details: "Downloaded PCI-related financials to local device.", compliance: "PCI/GDPR: Monitor for offline handling.", category: "compliance_gap" },
        { user: "kevin@dundermifflin.com", action: "Sheet Access", service: "Google Sheets", volume: "4 KB", risk: "high", details: "Accessed sensitive accounting sheet; multiple failed logins prior.", compliance: "Risk of mishandling; low security awareness.", category: "suspicious_activity" },
        { user: "toby@dundermifflin.com", action: "Calendar Share", service: "Google Calendar", volume: "500 B", risk: "low", details: "Shared HR privacy meeting invite.", compliance: "Weak enforcement; no data leak", category: "policy_violation" }
    ];

    for (const log of casbData) {
        await prisma.finding.create({
            data: {
                title: `${log.action}: ${log.service}`,
                description: `${log.details}\n\nCompliance Note: ${log.compliance}\nData Volume: ${log.volume}`,
                severity: log.risk as any,
                category: log.category as any,
                type: 'casb_log',
                status: 'open',
                integrationId: gWorkspace.id,
                affectedUser: log.user,
                cloudService: log.service,

                firstSeenAt: new Date(),
                lastSeenAt: new Date()
            }
        });
    }

    // Agents & Audit Logs
    console.log('   🔸 Seeding Agents & Logs...');

    // Cleanup old placeholders
    await prisma.agent.deleteMany({
        where: { OR: [{ name: 'CEO-LAPTOP' }, { name: 'WEB-SERVER-PROD' }, { id: 'agent-demo-01' }, { id: 'agent-demo-02' }] }
    });


    const agentsData = [
        { name: "Dwight's Office PC", ip: "192.168.1.101", platform: "windows", os: "Windows NT 10.0", user: "Dwight (Admin)", action: "POST /api/orders/create", status: 200, note: "Authorized admin access; logged customer data (GDPR compliant)." },
        { name: "Michael's Laptop", ip: "192.168.1.102", platform: "macos", os: "macOS 10.15.7", user: "Michael (Exec)", action: "GET /admin/dashboard", status: 200, note: "Policy view only; no data modification." },
        { name: "Angela's Secure Workstation", ip: "192.168.1.103", platform: "windows", os: "Windows NT 10.0", user: "Angela (Finance)", action: "POST /api/payments/process", status: 200, note: "PCI-compliant gateway integration." },
        { name: "Pam's Mobile", ip: "192.168.1.104", platform: "macos", os: "iOS 17.1", user: "Pam (Standard)", action: "PUT /user/profile/update", status: 200, note: "User data update; consent banner logged." },
        { name: "Ryan's Dev Script", ip: "192.168.1.105", platform: "linux", os: "curl/7.68.0", user: "Ryan (Dev)", action: "GET /api/inventory/check", status: 403, note: "Unauthorized script access; flagged." },
        { name: "Toby's Old PC", ip: "192.168.1.106", platform: "windows", os: "Windows 7", user: "Toby (HR)", action: "GET /hr/privacy/review", status: 200, note: "Privacy policy access; weak enforcement noted." },
        { name: "Kevin's Tablet", ip: "192.168.1.107", platform: "linux", os: "Android 13", user: "Kevin (Accounting)", action: "GET /accounting/export", status: 200, note: "Data export; high risk of mishandling." }
    ];

    for (const data of agentsData) {
        const agentId = `agent-${data.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

        // Create Agent
        // Create Agent
        await prisma.agent.upsert({
            where: { id: agentId },
            update: {
                name: data.name,
                platform: data.platform as any,
                osVersion: data.os,
                ipAddress: data.ip,
                status: 'Active',
                projectId: project.id,
                hostname: data.name.toLowerCase().replace(/\s/g, '-')
            },
            create: {
                id: agentId,
                name: data.name,
                platform: data.platform as any,
                osVersion: data.os,
                ipAddress: data.ip,
                status: 'Active',
                projectId: project.id,
                hostname: data.name.toLowerCase().replace(/\s/g, '-')
            }
        });

        // Create Associated Audit Log
        await prisma.auditLog.create({
            data: {
                id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userName: data.user,
                action: data.action.split(' ')[0], // Method
                details: `${data.action} - ${data.note} (Status: ${data.status})`,
                severity: data.status === 403 ? 'High' : (data.note.includes('risk') ? 'Medium' : 'Low'),
                timestamp: new Date()
            }
        });
    }


    // 5. Upload Evidence to MinIO (Bulk)
    console.log('   🔸 Seeding Evidence...');
    const Client = require('minio').Client;


    const minioClient = new Client({
        endPoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY
    });

    const bucketName = process.env.MINIO_BUCKET || 'evidence';
    const filesDir = path.join(__dirname, 'files');

    // MAPPING: Auditor Comments -> Evidence Filenames
    const EVIDENCE_COMMENTS: Record<string, string> = {
        "Information Security Policy.pdf": "Confirm policy is dated, approved by top-management, communicated to all staff & reviewed at planned intervals (keep evidence of review minutes).",
        "ACCESS CONTROL POLICY.pdf": "Ensure policy defines rule-of-least-privilege, access-provisioning / de-provisioning workflow, and unique ID requirements; sample a few user accounts for compliance.",
        "Acceptable Use Policy.pdf": "Check that employees & contractors sign acknowledgement; verify policy covers e-mail, internet, BYOD and cloud services.",
        "HR_Personnel Security Policy.pdf": "Validate background-check matrix (how deep per role), clause in employment contracts, training log completeness, and access-revocation checklist on exit.",
        "DATA PROTECTION & PRIVACY POLICY.pdf": "Cross-map to GDPR/CCPA clauses; confirm classification scheme is linked to retention & labelling rules; spot-check if confidential print-outs are labelled.",
        "PCI Compliance Policy.pdf": "Ensure scope of card-holder environment is documented; verify policy references PCI-DSS v4.0 Req. 12 & includes quarterly compliance attestation.",
        "INCIDENT RESPONSE & BREACH NOTIFICATION POLICY.pdf": "Review incident response plan for defined roles, SLA (e.g., 72 h GDPR), evidence-chain form, and post-incident lessons-learned log.",
        "Business Continuity & Disaster Recovery Policy.md": "Check RTO/RPO alignment to risk assessment, last failover test report, and ICT redundancy (backup power, mirrored site).",
        "Logging & Monitoring Policy.pdf": "Confirm log retention ≥ 1 year, logs synchronized, SIEM rules tuned, and access to logs is role-restricted.",
        "Information Asset Inventory.pdf": "Sample a few assets: verify owner, classification, location, and license status; ensure inventory is ≤ 30 days old.",
        "Supplier Security Policy.odt": "Ensure policy covers risk tiering, security schedule in contracts, right-to-audit clause, and annual review of critical suppliers.",
        "Supplier Security Policy.docx": "Ensure policy covers risk tiering, security schedule in contracts, right-to-audit clause, and annual review of critical suppliers.",
        "Statement of Applicability (SoA).docx": "Validate SoA contains justification for inclusion/exclusion of every control, version, and approval; cross-link to risk treatment plan.",
        "PENETRATION TEST REPORT - PAPERWORKS ONLINE LTD.pdf": "Check scope, methodology (OWASP Top-10 / PTES), critical findings closed within SLA, and retest evidence; confirm independence of tester.",
        "Awareness training.wav": "Verify training frequency (at least annual), content covers phishing & password hygiene, attendance tracking, and pass-rate metrics.",
        "GDPR & PCI Security Training.pptx": "Ensure material is up-to-date (include AI threats) and mapped to role-based curricula.",
        "sshd_config": "Inspect config for root-login=no, key-auth only, approved ciphers (no CBC), idle-timeout ≤ 15 min, and centralised syslog forwarding.",
        "redis.conf": "Confirm bind to localhost only where applicable, password set, maxmemory policy defined, and latest stable patch installed.",
        "nginx.conf": "Verify TLS 1.2/1.3 only, strong cipher suite, security headers (HSTS, X-Content-Type), rate-limiting, and current version.",
        "Network Firewall Logs.log": "Sample rule-base for deny-all default, check change tickets match timestamps, and ensure logs are shipped to SIEM unaltered.",
        "Web Application Firewall (WAF) Events.logs.txt": "Validate WAF in block-mode (not just detect), rule-set updated within 30 days, and false-positive rate tracked.",
        "Administrative Actions Log.txt": "Trace a few privileged commands to approved change ticket; verify log cannot be edited by admins (WORM/storage).",
        "Failed Authentication Attempts.log": "Check threshold lockout (e.g., 5 failures), alert routed to SOC, and no service accounts exempted unjustifiably.",
        "Successful Administrative Access.log": "Ensure logs show MFA used, access reason captured, and quarterly review of dormant admin accounts.",
        "Privacy Policy _ Paperworks.pdf": "Confirm policy is public-facing, aligns with legal register, and records processor vs controller responsibilities.",
        "Terms of Service _ Paperworks.pdf": "Verify ToS covers IP ownership, user-generated content, and governing law; check last review date.",
        "git scanning.png": "Ensure scan covers secrets/keys in repos, high-severity findings resolved within 15 days, and tool integrated into CI.",
        "Google workspace MDM.png": "Verify MDM enforces screen-lock, encrypted storage, remote-wipe, and jailbreak detection.",
        "google workspace roles.webp": "Cross-check role definitions follow least-privilege, no custom roles with wildcard permissions, and quarterly recertification.",
        "GCP mfa.png": "Confirm MFA is mandatory for console & API keys, hardware-token allowed, and no legacy SMS-only on privileged accounts.",
        "GCP db roles.png": "Validate separation of database admin vs cloud admin roles; check default service account disabled.",
        "GCP roles.png": "Ensure IAM policies attached to groups, not individuals, and excess accounts pruned.",
        "GCP deployment.png": "Verify CI/CD pipeline requires peer review, automated security tests, and change log in ticketing system.",
        "GCP network.png": "Inspect VPC flow-logs enabled, subnet segregation mirrors data-classification zones, and firewall rules tagged.",
        "GCP logging.jpg": "Ensure Cloud Audit Logs (Admin, Data Access) are immutable (bucket with retention lock) and exported to SIEM.",
        "network diagram.png": "Confirm diagram shows security zones (DMZ, internal, restricted), IDS/IPS placement, and aligns with actual firewall rules."
    };

    // MAPPING: Evidence Filenames -> Control Codes
    const EVIDENCE_MAP: Record<string, string[]> = {
        "Information Security Policy .pdf": ["A.5.1"], // Note space in filename from previous log
        "Information Security Policy.pdf": ["A.5.1"],
        "ACCESS CONTROL POLICY.pdf": ["A.5.15", "A.5.16", "A.5.18"],
        "Acceptable Use Policy.pdf": ["A.5.10"],
        "HR _ Personnel Security Policy.pdf": ["A.6.1", "A.6.2", "A.6.3", "A.6.5"],
        "DATA PROTECTION & PRIVACY POLICY.pdf": ["A.5.34", "A.5.12", "A.5.13"],
        "PCI Compliance Policy.pdf": ["A.5.31", "A.5.32", "A.5.36"],
        "INCIDENT RESPONSE & BREACH NOTIFICATION POLICY.pdf": ["A.5.24", "A.5.25", "A.5.26", "A.5.27", "A.5.28"],
        "Business Continuity & Disaster Recovery Policy.md": ["A.5.29", "A.5.30"],
        "Logging & Monitoring Policy.pdf": ["A.8.15", "A.8.16"],
        "Information Asset Inventory.pdf": ["A.5.9"],
        "Supplier Security Policy.odt": ["A.5.19", "A.5.20", "A.5.22"],
        "Supplier Security Policy.docx": ["A.5.19", "A.5.20", "A.5.22"],
        "Statement of Applicability (SoA).docx": ["A.5.35"],
        "PENETRATION TEST REPORT - PAPERWORKS ONLINE LTD.pdf": ["A.8.29"],
        "Awareness training.wav": ["A.6.3"],
        "GDPR & PCI Security Training.pptx": ["A.6.3"],
        "sshd_config": ["A.8.9", "A.8.20"],
        "redis.conf": ["A.8.9", "A.8.6", "A.8.8"],
        "nginx.conf": ["A.8.9", "A.8.20", "A.8.21"],
        "Network Firewall Logs.log": ["A.8.20", "A.8.22"],
        "Web Application Firewall (WAF) Events.logs.txt": ["A.8.20", "A.8.23"],
        "Administrative Actions Log.txt": ["A.8.15", "A.8.16"],
        "Failed Authentication Attempts.log": ["A.8.15", "A.8.5"],
        "Successful Administrative Access.log": ["A.8.15", "A.5.18"],
        "Privacy Policy _ Paperworks.pdf": ["A.5.34"],
        "Terms of Service _ Paperworks.pdf": ["A.5.31", "A.5.32"],
        "git scanning.png": ["A.8.8", "A.8.29"],
        "Google workspace MDM.png": ["A.8.1", "A.8.5"],
        "google workspace roles.webp": ["A.5.2", "A.5.16"],
        "GCP mfa.png": ["A.8.5", "A.5.17"],
        "GCP db roles.png": ["A.8.2", "A.5.18"],
        "GCP roles.png": ["A.5.2", "A.5.16"],
        "GCP deployment.png": ["A.8.32", "A.8.9"],
        "GCP network.png": ["A.8.20", "A.8.22"],
        "GCP logging.jpg": ["A.8.15", "A.8.16"],
        "network diagram.png": ["A.8.20", "A.8.22"]
    };

    try {
        // Ensure bucket
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        // Sync Project Node first
        try {
            await neo4jSyncQueue.add('project_updated', {
                eventId: `SEED-${Date.now()}`,
                payload: {
                    id: project.id,
                    name: project.name,
                    managerId,
                    customerId: null
                }
            });
        } catch (e) { console.warn('Neo4j project sync warn'); }

        if (fs.existsSync(filesDir)) {
            const files = fs.readdirSync(filesDir);
            console.log(`      found ${files.length} files to upload.`);

            for (const file of files) {
                // Skip the CSV data file if it ended up here
                if (file.endsWith('.csv')) continue;

                const filePath = path.join(filesDir, file);
                const fileStats = fs.statSync(filePath);

                if (fileStats.isFile()) {
                    const fileBuffer = fs.readFileSync(filePath);
                    // Match the structure used by uploads.ts: ${projectId}/${filename}
                    const objectName = `${project.id}/${file}`;

                    await minioClient.putObject(bucketName, objectName, fileBuffer);

                    // Determine Controls to link
                    const matchedCodes = EVIDENCE_MAP[file] || [];
                    const connectControls = matchedCodes
                        .map(code => codeToPCId.get(code))
                        .filter(id => !!id)
                        .map(id => ({ id: id! }));

                    if (connectControls.length > 0) {
                        console.log(`      ✅ Uploaded ${file} (Linked to: ${matchedCodes.join(', ')})`);
                    } else {
                        console.log(`      ✅ Uploaded ${file} (No controls linked)`);
                    }

                    // Create Tags based on filename & Linked Controls
                    const tagsList = ['iso 27001', 'demo'];
                    if (file.toLowerCase().includes('policy')) tagsList.push('policy');
                    if (file.toLowerCase().includes('procedure')) tagsList.push('procedure');

                    // Append tags from linked controls
                    if (matchedCodes.length > 0) {
                        matchedCodes.forEach(c => {
                            const cTags = codeToTags.get(c);
                            if (cTags) {
                                console.log(`      🔗 Linking tags from ${c}: [${cTags.join(', ')}]`);
                                cTags.forEach(t => {
                                    if (!tagsList.includes(t)) tagsList.push(t);
                                });
                            } else {
                                console.warn(`      ⚠️  No tags found in legacy cache for control code: "${c}" (Map size: ${codeToTags.size})`);
                                // Debug: check similar keys?
                                // const similar = Array.from(codeToTags.keys()).filter(k => k.includes(c));
                                // console.log(`         Did you mean? ${similar.join(', ')}`);
                            }
                        });
                    }

                    // Proxy URL matching /api/uploads/download logic
                    const fileUrl = `/api/uploads/download/${project.id}/${file}`;

                    // Create Evidence Record
                    const evidence = await prisma.evidence.create({
                        data: {
                            projectId: project.id,
                            fileName: file,
                            fileUrl: fileUrl,
                            type: 'document',
                            uploadedById: managerId,
                            tags: {
                                connectOrCreate: tagsList.map(t => ({
                                    where: { name: t },
                                    create: { name: t }
                                }))
                            },
                            // Explicit link to Project Controls
                            controls: {
                                connect: connectControls
                            }
                        }
                    });

                    // Add Auditor Comment if exists
                    if (EVIDENCE_COMMENTS[file]) {
                        await prisma.evidenceAnnotation.create({
                            data: {
                                evidenceId: evidence.id,
                                authorId: auditorId, // Assign comment to the Demo Auditor
                                text: EVIDENCE_COMMENTS[file],
                                page: 1,
                                x: 10, // Arbitrary position
                                y: 10
                            }
                        });
                        console.log(`         📝 Added auditor comment.`);
                    }

                    // Update evidence counts on controls (Optional, but good for consistency if sync is slow)
                    // The triggers or application logic usually handle this, but for seed we can leave it.

                    // Sync Evidence to Neo4j
                    try {
                        await neo4jSyncQueue.add('evidence_uploaded', {
                            eventId: `SEED-${Date.now()}`,
                            payload: {
                                id: evidence.id,
                                projectId: project.id,
                                fileName: evidence.fileName,
                                tags: tagsList,
                                uploadedById: managerId
                            }
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
