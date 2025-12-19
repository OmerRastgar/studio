
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('=== COMPREHENSIVE PROJECT & EVIDENCE ANALYSIS ===\n');

        // 1. Check evidence data
        const evidenceCount = await prisma.evidence.count();
        const evidenceItemCount = await prisma.evidenceItem.count();
        console.log(`Total Evidence (project-level): ${evidenceCount}`);
        console.log(`Total EvidenceItems (control-level): ${evidenceItemCount}\n`);

        // 2. List ALL projects with their stats
        const projects = await prisma.project.findMany({
            include: {
                framework: true,
                _count: {
                    select: {
                        projectControls: true,
                        evidence: true
                    }
                }
            }
        });

        console.log('=== ALL PROJECTS ===');
        projects.forEach(p => {
            console.log(`ID: ${p.id}`);
            console.log(`  Name: ${p.name}`);
            console.log(`  Framework: ${p.framework?.name || 'NONE'} (${p.frameworkId || 'null'})`);
            console.log(`  Controls: ${p._count.projectControls}`);
            console.log(`  Evidence: ${p._count.evidence}`);
            console.log('');
        });

        // 3. Fix ALL projects with 0 controls but valid framework
        const emptyProjects = projects.filter(p =>
            p._count.projectControls === 0 && p.frameworkId !== null
        );

        console.log(`\n=== FIXING ${emptyProjects.length} EMPTY PROJECTS ===\n`);

        for (const project of emptyProjects) {
            console.log(`Fixing: ${project.name} (${project.id})`);

            const masterControls = await prisma.control.findMany({
                where: { frameworkId: project.frameworkId! }
            });

            console.log(`  Found ${masterControls.length} master controls`);

            let added = 0;
            for (const mc of masterControls) {
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
            console.log(`  ✓ Added ${added} controls\n`);
        }

        console.log('=== FINAL VERIFICATION ===');
        const finalProjects = await prisma.project.findMany({
            include: {
                _count: {
                    select: { projectControls: true }
                }
            }
        });

        finalProjects.forEach(p => {
            console.log(`${p.name}: ${p._count.projectControls} controls`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
