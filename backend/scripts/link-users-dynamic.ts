
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Starting dynamic user linking...')

    // 1. Find the Manager
    const manager = await prisma.user.findFirst({
        where: { role: 'manager' }
    })

    if (!manager) {
        console.error('No manager found!')
        return
    }
    console.log(`Found Manager: ${manager.email} (${manager.id})`)

    // 2. Find the Customer
    const customer = await prisma.user.findFirst({
        where: { role: 'customer' }
    })

    if (!customer) {
        console.error('No customer found!')
        // Proceeding partially if possible, but compliance link will fail
    } else {
        console.log(`Found Customer: ${customer.email} (${customer.id})`)
    }

    // 3. Update Auditors -> Link to Manager
    const auditorsResult = await prisma.user.updateMany({
        where: { role: 'auditor' },
        data: { managerId: manager.id }
    })
    console.log(`Linked ${auditorsResult.count} auditors to Manager.`)

    // 4. Update Customers -> Link to Manager
    const customersResult = await prisma.user.updateMany({
        where: { role: 'customer' },
        data: { managerId: manager.id }
    })
    console.log(`Linked ${customersResult.count} customers to Manager.`)

    // 5. Update Compliance -> Link to Customer
    if (customer) {
        const complianceResult = await prisma.user.updateMany({
            where: { role: 'compliance' },
            data: { linkedCustomerId: customer.id }
        })
        console.log(`Linked ${complianceResult.count} compliance users to Customer.`)
    }

    console.log('Linking complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
