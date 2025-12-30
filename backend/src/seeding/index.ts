import { seedAdmin } from './admin';
import { seedDemo } from './demo';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Seeding Process...\n');

    try {
        // 1. Critical System Seeds
        await seedAdmin();

        // 2. Demo Environment Seeds
        // (Optional: Check env var like START_WITH_DEMO=true, but user wants it standard for now)
        await seedDemo();

        console.log('\n✅ Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seeding Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
