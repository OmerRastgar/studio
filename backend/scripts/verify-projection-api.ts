

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const API_URL = 'http://127.0.0.1:4000/api';

async function verifyCompliance() {
    try {
        console.log('--- Verifying Compliance Projection API ---');

        // 1. Get a test user (customer)
        const user = await prisma.user.findUnique({
            where: { email: 'customer@example.com' }
        });

        if (!user) {
            console.error('No customer user found to test with.');
            return;
        }
        console.log(`Testing with user: ${user.email} (${user.id})`);

        // Reset password to ensure we can login
        // Note: In a real env strict hashing is needed, but let's assume standard bcrypt or whatever the app uses.
        // Actually, the app uses bcrypt. We need to hash it.
        // Since we don't have bcrypt easily in this script without installing types, 
        // we can just "Update" the user to have a hash we know?
        // Or better, let's just make the script depend on 'bcryptjs' which IS in the backend package.json.
        /* eslint-disable @typescript-eslint/no-require-imports */
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('password123', 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
        console.log('Password reset to "password123".');

        // Ensure User exists in Neo4j (Crucial for the query to work)
        const neo4jNodeCheck = await fetch(`${API_URL}/system/health`); // Just keep connection open? No.
        // We need direct neo4j access in this script.
        const neo4jVal = require('neo4j-driver');
        const driver = neo4jVal.driver(
            process.env.NEO4J_URI || 'bolt://neo4j:7687',
            neo4jVal.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'auditgraph123')
        );
        const session = driver.session();
        await session.run(`MERGE (u:User {id: $id}) SET u.email = $email`, { id: user.id, email: user.email });
        await session.close();
        await driver.close();
        console.log('Ensured User node exists in Neo4j.');

        // 2. Generate Token (Simulated - in real verifying we might need a real login or helper)
        // Since we are running on the server machine, we can cheat significantly 
        // by making a quick "generate token" script or just assuming we can hit the endpoint if we bypass auth?
        // No, the endpoint uses `authenticate`.
        // Let's use the login endpoint to get a real token.
        // Assuming default seed password 'password123' works for seed users.

        let token = '';
        try {
            const loginRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    password: 'password123'
                })
            });
            console.log('Login Status:', loginRes.status);
            const loginData = await loginRes.json();
            if (!loginRes.ok) {
                console.error('Login Error Body:', loginData);
                throw new Error('Login returned ' + loginRes.status);
            }
            token = loginData.token;
            console.log('Login successful.');
        } catch (e) {
            console.warn('Login failed:', e);
            if (e instanceof Error) console.warn(e.message);
            // also try to log response status if available? fetch throws on network error only.
            // If it's a 401, fetch doesn't throw.
            // So we need to check res.ok inside the try.
            return;
        }


        // 3. Call Projection API
        const res = await fetch(`${API_URL}/compliance/projection`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const json = await res.json();
        const fs = require('fs');
        /* eslint-enable @typescript-eslint/no-require-imports */
        fs.writeFileSync('projection_output.json', JSON.stringify(json, null, 2));
        console.log('API Response written to projection_output.json');

        // 4. Validate Structure
        const data = json.data;
        if (Array.isArray(data) && data.length > 0) {
            console.log('PASSED: Returned array of standards.');
            const first = data[0];
            if (first.name && typeof first.percentage === 'number') {
                console.log(`PASSED: Structure valid. Example: ${first.name} = ${first.percentage}%`);
            } else {
                console.log('FAILED: Structure invalid.', first);
            }
        } else {
            console.log('WARNING: Returned empty array (No Standards?).');
        }

    } catch (error: any) {
        console.error('Test Failed:', error.response?.data || error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verifyCompliance();
