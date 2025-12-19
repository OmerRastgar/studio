
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    try {
        // 1. Global Counts
        const pcCount = await prisma.projectControl.count();
        const pCount = await prisma.project.count();
        console.log(`Global Stats: Projects=${pCount}, ProjectControls=${pcCount}`);

        // 2. List Projects
        const projects = await prisma.project.findMany({
            include: {
                _count: {
                    select: {
                        projectControls: true,
                        evidence: true
                    }
                }
            }
        });

        console.log('--- Projects ---');
        projects.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.name} | Controls: ${p._count.projectControls} | Evidence: ${p._count.evidence}`);
        });

        // 3. Find first project WITH controls
        const projectWithControls = projects.find(p => p._count.projectControls > 0);

        if (projectWithControls) {
            console.log(`\n--- Inspecting Project: ${projectWithControls.id} ---`);
            const project = await prisma.project.findUnique({
                where: { id: projectWithControls.id },
                include: {
                    projectControls: {
                        take: 2,
                        include: {
                            control: {
                                include: { tags: true }
                            }
                        }
                    }
                }
            });
            console.log('Control Sample:', JSON.stringify(project?.projectControls, null, 2));
        } else {
            console.log('\nNO Projects have controls!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
