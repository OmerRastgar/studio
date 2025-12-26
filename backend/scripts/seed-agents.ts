import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAgents() {
    console.log('Seeding sample agents...');

    const sampleAgents = [
        {
            id: 'agent-win-001',
            name: 'DESKTOP-FINANCE-01',
            platform: 'windows',
            status: 'Active',
            hostname: 'DESKTOP-FINANCE-01.corp.local',
            ipAddress: '192.168.1.100',
            osVersion: 'Windows 11 Pro 22H2',
            version: '5.10.1',
            lastSync: new Date('2024-12-22T19:30:00Z'),
            lastSeenAt: new Date('2024-12-22T19:30:00Z')
        },
        {
            id: 'agent-mac-002',
            name: 'MacBook-Sarah',
            platform: 'macos',
            status: 'Active',
            hostname: 'MacBook-Sarah.local',
            ipAddress: '192.168.1.105',
            osVersion: 'macOS Sonoma 14.2.1',
            version: '5.10.1',
            lastSync: new Date('2024-12-22T19:25:00Z'),
            lastSeenAt: new Date('2024-12-22T19:25:00Z')
        },
        {
            id: 'agent-linux-003',
            name: 'SERVER-PROD-WEB-01',
            platform: 'linux',
            status: 'Active',
            hostname: 'prod-web-01.internal',
            ipAddress: '10.0.1.50',
            osVersion: 'Ubuntu 22.04.3 LTS',
            version: '5.9.2',
            lastSync: new Date('2024-12-22T19:35:00Z'),
            lastSeenAt: new Date('2024-12-22T19:35:00Z')
        },
        {
            id: 'agent-win-004',
            name: 'LAPTOP-SALES-04',
            platform: 'windows',
            status: 'Offline',
            hostname: 'LAPTOP-SALES-04.corp.local',
            ipAddress: '192.168.1.150',
            osVersion: 'Windows 10 Pro 21H2',
            version: '5.8.0',
            lastSync: new Date('2024-12-20T14:00:00Z'),
            lastSeenAt: new Date('2024-12-20T14:00:00Z')
        },
        {
            id: 'agent-mac-005',
            name: 'iMac-DevTeam-05',
            platform: 'macos',
            status: 'Active',
            hostname: 'iMac-DevTeam-05.local',
            ipAddress: '192.168.1.120',
            osVersion: 'macOS Ventura 13.6',
            version: '5.10.1',
            lastSync: new Date('2024-12-22T19:28:00Z'),
            lastSeenAt: new Date('2024-12-22T19:28:00Z')
        },
        {
            id: 'agent-linux-006',
            name: 'SERVER-DB-PRIMARY',
            platform: 'linux',
            status: 'Error',
            hostname: 'db-primary.internal',
            ipAddress: '10.0.2.10',
            osVersion: 'Red Hat Enterprise Linux 8.8',
            version: '5.10.1',
            lastSync: new Date('2024-12-22T18:00:00Z'),
            lastSeenAt: new Date('2024-12-22T18:00:00Z')
        }
    ];

    for (const agent of sampleAgents) {
        await prisma.agent.upsert({
            where: { id: agent.id },
            update: agent as any,
            create: agent as any
        });
    }

    console.log(`Created ${sampleAgents.length} sample agents`);
}

seedAgents()
    .catch((e) => {
        console.error('Error seeding agents:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
