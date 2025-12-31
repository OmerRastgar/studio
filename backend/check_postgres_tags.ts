
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkControlTags() {
    console.log('Checking Postgres Data...');

    // 1. Find PCI DSS Framework
    const pci = await prisma.framework.findFirst({
        where: { name: { contains: 'PCI', mode: 'insensitive' } }
    });

    if (!pci) {
        console.log('❌ PCI DSS Framework not found in Postgres.');
        return;
    }
    console.log(`✅ Found Framework: ${pci.name} (${pci.id})`);

    // 2. Check Controls and their Tags
    const controls = await prisma.control.findMany({
        where: { frameworkId: pci.id },
        include: { tags: true },
        take: 5
    });

    if (controls.length === 0) {
        console.log('❌ No controls found for this framework.');
    } else {
        console.log(`✅ Found ${controls.length} sample controls:`);
        controls.forEach(c => {
            const tagNames = c.tags.map(t => t.name).join(', ');
            console.log(`   - [${c.code}] ${c.title.substring(0, 30)}... | Tags: [${tagNames}]`);
        });
    }
}

checkControlTags()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
