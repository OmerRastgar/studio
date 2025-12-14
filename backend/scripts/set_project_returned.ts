
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        // Find the first project
        const project = await prisma.project.findFirst();

        if (!project) {
            console.log('No projects found.');
            return;
        }

        // Update status to 'returned'
        const updated = await prisma.project.update({
            where: { id: project.id },
            data: { status: 'returned' }
        });

        console.log(`Successfully updated project "${updated.name}" (ID: ${updated.id}) to status 'returned'.`);
    } catch (error) {
        console.error('Error updating project:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
