import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAgents() {
    const agents = await prisma.agent.findMany();
    console.log('Agents count:', agents.length);
    console.log(JSON.stringify(agents, null, 2));
}

checkAgents()
    .finally(async () => {
        await prisma.$disconnect();
    });
