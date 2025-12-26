import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCASB() {
    console.log('Seeding sample CASB integrations...');

    // Get first user as owner
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
        console.log('No users found - please create users first');
        return;
    }

    const sampleIntegrations = [
        {
            name: 'Company Microsoft 365',
            type: 'saas_office365',
            vendor: 'Microsoft',
            status: 'active',
            authType: 'oauth2',
            config: {
                clientId: 'ms365-client-id-xxxx',
                tenantId: 'company-tenant-xxxx'
            },
            syncFrequency: 3600,
            lastSyncAt: new Date('2024-12-22T19:00:00Z'),
            nextSyncAt: new Date('2024-12-22T20:00:00Z'),
            createdById: firstUser.id
        },
        {
            name: 'Corporate Google Workspace',
            type: 'saas_google_workspace',
            vendor: 'Google',
            status: 'active',
            authType: 'oauth2',
            config: {
                clientId: 'google-workspace-client-xxxx',
                domain: 'company.com'
            },
            syncFrequency: 7200,
            lastSyncAt: new Date('2024-12-22T18:30:00Z'),
            nextSyncAt: new Date('2024-12-22T20:30:00Z'),
            createdById: firstUser.id
        },
        {
            name: 'Production AWS Account',
            type: 'saas_aws',
            vendor: 'Amazon Web Services',
            status: 'active',
            authType: 'api_key',
            config: {
                apiKey: 'aws-key-xxxx',
                region: 'us-east-1',
                accountId: '123456789012'
            },
            syncFrequency: 1800,
            lastSyncAt: new Date('2024-12-22T19:15:00Z'),
            nextSyncAt: new Date('2024-12-22T19:45:00Z'),
            createdById: firstUser.id
        },
        {
            name: 'Netskope CASB',
            type: 'casb_netskope',
            vendor: 'Netskope',
            status: 'active',
            authType: 'api_key',
            config: {
                apiKey: 'netskope-api-key-xxxx',
                endpoint: 'https://company.goskope.com/api/v2'
            },
            syncFrequency: 900,
            lastSyncAt: new Date('2024-12-22T19:35:00Z'),
            nextSyncAt: new Date('2024-12-22T19:50:00Z'),
            createdById: firstUser.id
        },
        {
            name: 'Cloudflare Zero Trust',
            type: 'casb_cloudflare',
            vendor: 'Cloudflare',
            status: 'pending',
            authType: 'api_key',
            config: {
                apiKey: 'cloudflare-api-key-xxxx',
                accountId: 'cf-account-xxxx'
            },
            syncFrequency: 3600,
            createdById: firstUser.id
        },
        {
            name: 'Azure AD Integration',
            type: 'saas_azure',
            vendor: 'Microsoft',
            status: 'syncing',
            authType: 'oauth2',
            config: {
                clientId: 'azure-ad-client-xxxx',
                tenantId: 'azure-tenant-xxxx'
            },
            syncFrequency: 3600,
            lastSyncAt: new Date('2024-12-22T19:20:00Z'),
            nextSyncAt: new Date('2024-12-22T20:20:00Z'),
            createdById: firstUser.id
        }
    ];

    for (const integration of sampleIntegrations) {
        await prisma.cASBIntegration.create({
            data: integration as any
        });
    }

    console.log(`Created ${sampleIntegrations.length} sample CASB integrations`);
}

seedCASB()
    .catch((e) => {
        console.error('Error seeding CASB integrations:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
