
import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- HEALING EVIDENCE COUNTS (STANDALONE) ---');

    // 1. Get all ProjectControls
    try {
        const allControls = await prisma.projectControl.findMany({
            select: { id: true, evidenceCount: true }
        });

        console.log(`Found ${allControls.length} controls.`);
        let fixedCount = 0;

        for (const pc of allControls) {
            // 2. Count actual evidence
            const actualCount = await prisma.evidence.count({
                where: {
                    controls: {
                        some: {
                            id: pc.id
                        }
                    }
                }
            });

            // 3. Update if different
            if (actualCount !== pc.evidenceCount) {
                console.log(`Fixing Control ${pc.id}: DB=${pc.evidenceCount} -> Actual=${actualCount}`);
                await prisma.projectControl.update({
                    where: { id: pc.id },
                    data: { evidenceCount: actualCount }
                });
                fixedCount++;
            }
        }

        console.log(`--- DONE. Fixed ${fixedCount} controls. ---`);
    } catch (e) {
        console.error("Error during healing:", e);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
