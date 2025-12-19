
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        // Find projects with NO controls but WITH a framework
        const emptyProjects = await prisma.project.findMany({
            where: {
                projectControls: { none: {} },
                frameworkId: { not: null }
            },
            include: { framework: true }
        });

        console.log(`Found ${emptyProjects.length} empty projects with frameworks.`);

        for (const project of emptyProjects) {
            if (!project.frameworkId) continue;

            console.log(`Fixing Project: ${project.name} (${project.id}) - Framework: ${project.framework?.name}`);

            // Fetch master controls
            const masterControls = await prisma.control.findMany({
                where: { frameworkId: project.frameworkId },
                include: { tags: true }
            });

            console.log(`- Found ${masterControls.length} master controls.`);

            if (masterControls.length === 0) continue;

            const createdControls = [];

            // Create ProjectControl for each master Control
            for (const mc of masterControls) {
                // Map tags to connect/create input logic if needed?
                // Actually ProjectControl doesn't store tags directly?
                // Wait, schema check: Does ProjectControl have 'tags'? No.
                // Control has tags. ProjectControl LINKS to Control.
                // So we just need to create ProjectControl linking to Control.

                const pc = await prisma.projectControl.create({
                    data: {
                        projectId: project.id,
                        controlId: mc.id,
                        evidenceCount: 0
                    }
                });
                createdControls.push(pc);
            }
            console.log(`- Created ${createdControls.length} project controls.`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
