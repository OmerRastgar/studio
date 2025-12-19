
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing Customer Project Query Structure...');

        // Find ANY project to test the query against
        const project = await prisma.project.findFirst({
            include: {
                framework: true,
                auditor: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                },
                projectControls: {
                    include: {
                        control: {
                            include: { tags: true }
                        },
                        evidenceItems: {
                            include: {
                                uploadedBy: {
                                    select: { id: true, name: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (project) {
            console.log('Query Successful!');
            console.log(`Project: ${project.name}`);
            console.log(`Controls: ${project.projectControls.length}`);
            if (project.projectControls.length > 0) {
                console.log('Control Tags Sample:', JSON.stringify(project.projectControls[0].control.tags));
            }
        } else {
            console.log('Query valid but no project found.');
        }

    } catch (error) {
        console.error('Query Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
