import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');

        const projects = await prisma.project.findMany();
        console.log(`Found ${projects.length} projects.`);

        let updatedCount = 0;
        for (const p of projects) {
            if (!p.startDate || !p.endDate) {
                const startDate = p.createdAt;
                const endDate = p.dueDate || new Date(p.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

                await prisma.project.update({
                    where: { id: p.id },
                    data: {
                        startDate,
                        endDate
                    }
                });
                updatedCount++;
            }
        }
        console.log(`Updated ${updatedCount} projects with default dates.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
