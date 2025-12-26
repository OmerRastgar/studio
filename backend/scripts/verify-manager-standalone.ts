
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB STANDALONE CHECK ---');
    const email = 'manager@example.com';
    console.log(`Checking for user: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            console.log(`User found: ${user.email}`);
            console.log(`ID: ${user.id}`);
            console.log(`Role: '${user.role}'`);
            console.log(`Status: ${user.status}`);
        } else {
            console.error(`User ${email} NOT FOUND in database.`);
            // List all users to see what's there
            const allUsers = await prisma.user.findMany({ select: { email: true, role: true } });
            console.log('Available users:', allUsers);
        }
    } catch (error) {
        console.error("Error querying database:", error);
    }
    console.log('---------------------');
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
