
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_ID = 'fea37ef0-f335-4615-84d5-d25750c3f5e8';

async function main() {
    try {
        console.log(`Inspecting Project: ${TARGET_ID}`);

        const project = await prisma.project.findUnique({
            where: { id: TARGET_ID },
            include: {
                framework: true,
                projectControls: {
                    include: { control: true }
                }
            }
        });

        if (!project) {
            console.log('Project NOT FOUND!');
            // List all projects to see if ID is close or user provided wrong one
            const all = await prisma.project.findMany({ select: { id: true, name: true } });
            console.log('Available Projects:');
            all.forEach(p => console.log(`- ${p.name} (${p.id})`));
            return;
        }

        console.log(`Project Name: ${project.name}`);
        console.log(`Framework: ${project.framework?.name} (${project.frameworkId})`);
        console.log(`Control Count: ${project.projectControls.length}`);

        if (project.projectControls.length === 0) {
            console.log('WARNING: 0 Controls found!');
            // Check if master controls exist for this framework
            if (project.frameworkId) {
                const masterCount = await prisma.control.count({
                    where: { frameworkId: project.frameworkId }
                });
                console.log(`Master Controls for Framework: ${masterCount}`);
            }
        } else {
            console.log('Controls exist. Sample first control:');
            console.log(JSON.stringify(project.projectControls[0].control, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
