
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkUser() {
    const user = await prisma.user.findUnique({
        where: { email: 'custurd@example.com' },
        select: { id: true, email: true, isNewUser: true, role: true }
    });
    console.log('User Check:', user);

    // Check custurd2 as well from logs
    const user2 = await prisma.user.findUnique({
        where: { email: 'custurd2@example.com' },
        select: { id: true, email: true, isNewUser: true, role: true }
    });
    console.log('User2 Check:', user2);
}

checkUser()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
