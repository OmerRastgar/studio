
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const project = await prisma.project.findFirst({
        include: {
            projectControls: {
                take: 3,
                include: { control: true }
            }
        }
    });

    if (!project) {
        console.log('No project found');
        return;
    }

    console.log('--- ID DEBUG ---');
    project.projectControls.forEach(pc => {
        console.log(`PC ID:      ${pc.id}`);
        console.log(`Control ID: ${pc.controlId}`); // effectively pc.control.id
        console.log(`Code:       ${pc.control.code}`);
        console.log('---');
    });
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
