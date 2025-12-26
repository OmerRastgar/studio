
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('--- Debugging Users ---');

    // 1. List all compliance users
    const complianceUsers = await prisma.user.findMany({
        where: { role: 'compliance' },
        include: { linkedCustomer: true }
    });

    console.log(`Found ${complianceUsers.length} compliance users:`);
    complianceUsers.forEach(u => {
        console.log(`- ${u.email} (ID: ${u.id}) -> Linked to: ${u.linkedCustomer?.email || 'NULL'} (ID: ${u.linkedCustomerId})`);
    });

    // 2. List our test customer
    const customer = await prisma.user.findUnique({
        where: { email: 'customer@example.com' }
    });
    console.log(`Test Customer ID: ${customer?.id}`);

    // 3. Check for ORPHANED compliance users (linkedCustomerId is null)
    // Maybe the link was lost?
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
