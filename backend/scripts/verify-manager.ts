
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('--- DB USER CHECK ---');
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
