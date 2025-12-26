import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFindings() {
    console.log('Seeding sample findings...');

    const sampleFindings = [
        {
            title: 'Gamed The Grey Server',
            alertName: 'Data leak - upload',
            description: 'Unauthorized data upload detected to personal cloud storage',
            severity: 'high',
            category: 'data_leak',
            type: 'cloud_upload',
            status: 'open',
            notified: true,
            affectedUser: 'john.doe@company.com',
            affectedResource: 'document-2024-Q3.xlsx',
            location: 'San Francisco, CA',
            cloudService: 'Azure',
            recommendation: 'Review and revoke access to personal cloud storage',
            firstSeenAt: new Date('2024-12-20T09:41:00Z'),
            lastSeenAt: new Date('2024-12-20T09:41:00Z')
        },
        {
            title: 'Malware Detection Alert',
            alertName: 'Malware - ransomware signature',
            description: 'Potential ransomware activity detected in file downloads',
            severity: 'critical',
            category: 'malware',
            type: 'ransomware',
            status: 'investigating',
            notified: true,
            affectedUser: 'sarah.smith@company.com',
            affectedResource: 'invoice_final.exe',
            location: 'New York, NY',
            cloudService: 'AWS',
            recommendation: 'Isolate affected system immediately and scan for threats',
            firstSeenAt: new Date('2024-12-22T14:23:00Z'),
            lastSeenAt: new Date('2024-12-22T14:23:00Z')
        },
        {
            title: 'Unauthorized Access Attempt',
            alertName: 'Login - suspicious location',
            description: 'Login attempt from unusual geographic location',
            severity: 'medium',
            category: 'unauthorized_access',
            type: 'suspicious_login',
            status: 'open',
            notified: false,
            affectedUser: 'mike.johnson@company.com',
            affectedResource: 'user-account',
            location: 'Moscow, Russia',
            cloudService: 'Google Workspace',
            recommendation: 'Enable MFA and review account activity',
            firstSeenAt: new Date('2024-12-21T03:15:00Z'),
            lastSeenAt: new Date('2024-12-21T03:15:00Z')
        },
        {
            title: 'Policy Violation - File Sharing',
            alertName: 'Policy - external share',
            description: 'Sensitive document shared externally without approval',
            severity: 'high',
            category: 'policy_violation',
            type: 'external_share',
            status: 'open',
            notified: true,
            affectedUser: 'emily.davis@company.com',
            affectedResource: 'financial-report-2024.pdf',
            location: 'London, UK',
            cloudService: 'Microsoft 365',
            recommendation: 'Revoke external share link and educate user',
            firstSeenAt: new Date('2024-12-22T11:30:00Z'),
            lastSeenAt: new Date('2024-12-22T11:30:00Z')
        },
        {
            title: 'Configuration Drift Detected',
            alertName: 'Config - security group modified',
            description: 'Security group rules changed to allow unrestricted access',
            severity: 'critical',
            category: 'misconfiguration',
            type: 'security_group',
            status: 'open',
            notified: true,
            affectedUser: 'admin@company.com',
            affectedResource: 'sg-prod-web-servers',
            location: 'US-East-1',
            cloudService: 'AWS',
            recommendation: 'Revert security group changes and review IAM permissions',
            firstSeenAt: new Date('2024-12-22T16:45:00Z'),
            lastSeenAt: new Date('2024-12-22T16:45:00Z')
        },
        {
            title: 'Anomalous Data Download',
            alertName: 'Anomaly - bulk download',
            description: 'Unusual volume of data downloaded by user account',
            severity: 'medium',
            category: 'anomaly',
            type: 'bulk_download',
            status: 'investigating',
            notified: false,
            affectedUser: 'contractor@external.com',
            affectedResource: 'customer-database',
            location: 'Chicago, IL',
            cloudService: 'Salesforce',
            recommendation: 'Investigate account activity and validate business need',
            firstSeenAt: new Date('2024-12-21T18:20:00Z'),
            lastSeenAt: new Date('2024-12-21T18:20:00Z')
        },
        {
            title: 'Privilege Escalation Attempt',
            alertName: 'Security - privilege escalation',
            description: 'Attempt to elevate user privileges detected',
            severity: 'high',
            category: 'suspicious_activity',
            type: 'privilege_escalation',
            status: 'resolved',
            notified: true,
            affectedUser: 'developer@company.com',
            affectedResource: 'iam-role-admin',
            location: 'Seattle, WA',
            cloudService: 'Azure',
            recommendation: 'Account has been temporarily suspended pending review',
            firstSeenAt: new Date('2024-12-19T22:10:00Z'),
            lastSeenAt: new Date('2024-12-19T22:10:00Z'),
            resolvedAt: new Date('2024-12-20T10:00:00Z')
        },
        {
            title: 'API Key Exposure',
            alertName: 'Vulnerability - credential leak',
            description: 'API credentials found in public GitHub repository',
            severity: 'critical',
            category: 'vulnerability',
            type: 'credential_exposure',
            status: 'open',
            notified: true,
            affectedUser: 'devops@company.com',
            affectedResource: 'prod-api-key',
            location: 'Public Internet',
            cloudService: 'GitHub',
            recommendation: 'Rotate credentials immediately and remove from repository',
            firstSeenAt: new Date('2024-12-22T08:00:00Z'),
            lastSeenAt: new Date('2024-12-22T08:00:00Z')
        }
    ];

    for (const finding of sampleFindings) {
        await prisma.finding.create({
            data: finding as any
        });
    }

    console.log(`Created ${sampleFindings.length} sample findings`);
}

seedFindings()
    .catch((e) => {
        console.error('Error seeding findings:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
