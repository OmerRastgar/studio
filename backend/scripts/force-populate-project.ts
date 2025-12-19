
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ID = 'fea37ef0-f335-4615-84d5-d25750c3f5e8';

async function main() {
    try {
        const project = await prisma.project.findUnique({
            where: { id: TARGET_ID },
            include: { framework: true }
        });

        if (!project || !project.frameworkId) {
            console.log('Valid project/framework not found');
            return;
        }

        console.log(`Populating Project: ${project.name}`);

        const masterControls = await prisma.control.findMany({
            where: { frameworkId: project.frameworkId }
        });

        console.log(`Found ${masterControls.length} Master Controls.`);

        let added = 0;
        for (const mc of masterControls) {
            // Check if exists to avoid duplicates (though current count is 0)
            const exists = await prisma.projectControl.findUnique({
                where: {
                    projectId_controlId: {
                        projectId: project.id,
                        controlId: mc.id
                    }
                }
            });

            if (!exists) {
                await prisma.projectControl.create({
                    data: {
                        projectId: project.id,
                        controlId: mc.id
                    }
                });
                added++;
            }
        }
        console.log(`Successfully added ${added} controls.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
