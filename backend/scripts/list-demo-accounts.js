#!/usr/bin/env node
/**
 * Verify and display Kratos demo account credentials
 * Run: node scripts/list-demo-accounts.js
 */

const https = require('http');

const KRATOS_ADMIN_URL = process.env.KRATOS_ADMIN_URL || 'http://localhost:4434';

async function listAccounts() {
    return new Promise((resolve, reject) => {
        const req = https.get(`${KRATOS_ADMIN_URL}/admin/identities?per_page=50`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result.identities || []);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
    });
}

async function main() {
    console.log('🔍 Fetching Kratos identities...\n');

    try {
        const identities = await listAccounts();

        console.log('📋 Demo Accounts:\n');
        console.log('┌─────────────────────────────┬──────────┬─────────────┐');
        console.log('│ Email                       │ Role     │ Password    │');
        console.log('├─────────────────────────────┼──────────┼─────────────┤');

        const demoAccounts = [
            'admin@example.com',
            'manager@example.com',
            'auditor@example.com',
            'customer@example.com'
        ];

        demoAccounts.forEach(email => {
            const identity = identities.find(i => i.traits?.email === email);
            if (identity) {
                const role = identity.traits.role || 'unknown';
                console.log(`│ ${email.padEnd(27)} │ ${role.padEnd(8)} │ password123 │`);
            } else {
                console.log(`│ ${email.padEnd(27)} │ MISSING  │ N/A         │`);
            }
        });

        console.log('└─────────────────────────────┴──────────┴─────────────┘\n');

        console.log('💡 Login Page: http://localhost/login');
        console.log('   Click any demo button to login\n');

        const missing = demoAccounts.filter(email =>
            !identities.find(i => i.traits?.email === email)
        );

        if (missing.length > 0) {
            console.log('⚠️  Missing accounts:', missing.join(', '));
            console.log('   Run seed script to create them\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('   Make sure Kratos is running on', KRATOS_ADMIN_URL);
    }
}

main();
