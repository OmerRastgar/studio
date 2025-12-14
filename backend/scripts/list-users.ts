
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            managerId: true,
            linkedCustomerId: true
        }
    })
    console.log('--- USERS LIST ---')
    console.log(JSON.stringify(users, null, 2))
    console.log('------------------')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
