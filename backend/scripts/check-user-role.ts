

import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'manager@example.com';
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
        console.log(`User ${email} not found.`);
    } else {
        console.log(`User Found:`, user);
        console.log(`Role in DB: '${user.role}'`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
