
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('--- Fixing Compliance User Link ---');

    const customerEmail = 'customer@example.com';
    const complianceEmail = 'th@example.com';

    const customer = await prisma.user.findUnique({ where: { email: customerEmail } });
    if (!customer) throw new Error('Customer not found');

    const compliance = await prisma.user.findUnique({ where: { email: complianceEmail } });
    if (!compliance) throw new Error('Compliance user not found');

    console.log(`Linking ${compliance.email} to ${customer.email}...`);

    await prisma.user.update({
        where: { id: compliance.id },
        data: { linkedCustomerId: customer.id }
    });

    console.log('Link restored.');
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
