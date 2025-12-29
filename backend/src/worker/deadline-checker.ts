
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/notification';

const prisma = new PrismaClient();

export class DeadlineChecker {
    // Check every day at 8 AM (approximate via interval)
    // For simplicity in this environment, we'll run it every hour and check if it's 8 AM, 
    // OR just run it once a day using a long interval. 
    // Better: Run every hour, check if we haven't run today? 
    // Simplest: Run every 24 hours. Start now? No.
    // We will use a simple interval that runs every hour.

    static init() {
        console.log('[DeadlineChecker] Initializing deadline checker...');
        // Run immediately on startup for dev/demo purposes
        this.checkDeadlines();

        // Then run every 24 hours (86400000 ms)
        setInterval(() => {
            this.checkDeadlines();
        }, 24 * 60 * 60 * 1000);
    }

    static async checkDeadlines() {
        try {
            console.log('[DeadlineChecker] checking deadlines...');
            const now = new Date();
            const threeDaysFromNow = new Date();
            threeDaysFromNow.setDate(now.getDate() + 3);

            const oneDayFromNow = new Date();
            oneDayFromNow.setDate(now.getDate() + 1);

            // 1. Check for projects approaching deadline (3 days)
            const dueIn3Days = await prisma.project.findMany({
                where: {
                    status: 'approved',
                    dueDate: {
                        gte: new Date(new Date().setDate(new Date().getDate() + 2)), // > 2 days
                        lte: threeDaysFromNow // <= 3 days
                    }
                },
                include: {
                    customer: true,
                    auditor: true
                }
            });

            // 2. Check for projects approaching deadline (1 day)
            const dueIn1Day = await prisma.project.findMany({
                where: {
                    status: 'approved',
                    dueDate: {
                        gte: now,
                        lte: oneDayFromNow
                    }
                },
                include: {
                    customer: true,
                    auditor: true
                }
            });

            // 3. Check for overdue projects
            const overdue = await prisma.project.findMany({
                where: {
                    status: 'approved',
                    dueDate: { lt: now }
                },
                include: {
                    customer: {
                        include: {
                            // Fetch manager via user relation if exists?
                            // User model has managerId, but implies *their* manager.
                            // We need to fetch the manager user if applicable.
                            // Let's assume we just notify the customer and auditor for now.
                        }
                    },
                    auditor: true
                }
            });

            console.log(`[DeadlineChecker] Found: ${dueIn3Days.length} due in 3 days, ${dueIn1Day.length} due in 1 day, ${overdue.length} overdue.`);

            // Send Notifications

            // 3 Days Warning
            for (const p of dueIn3Days) {
                // Notify Customer
                if (p.customerId) {
                    await NotificationService.create(p.customerId, 'deadline', 'Project Deadline Approaching', `Project ${p.name} is due in 3 days.`, `/dashboard/customer/projects`);
                }
                // Notify Auditor
                if (p.auditorId) {
                    await NotificationService.create(p.auditorId, 'deadline', 'Project Deadline Approaching', `Project ${p.name} is due in 3 days.`, `/dashboard/auditor/projects/${p.id}`);
                }
            }

            // 1 Day Warning
            for (const p of dueIn1Day) {
                // Notify Customer
                if (p.customerId) {
                    await NotificationService.create(p.customerId, 'deadline', 'Project Deadline Tomorrow', `Project ${p.name} is due tomorrow!`, `/dashboard/customer/projects`);
                }
                // Notify Auditor
                if (p.auditorId) {
                    await NotificationService.create(p.auditorId, 'deadline', 'Project Deadline Tomorrow', `Project ${p.name} is due tomorrow!`, `/dashboard/auditor/projects/${p.id}`);
                }
            }

            // Overdue
            for (const p of overdue) {
                // Notify Customer
                if (p.customerId) {
                    await NotificationService.create(p.customerId, 'overdue', 'Project Overdue', `Project ${p.name} is overdue! Please contact support.`, `/dashboard/customer/projects`);
                }
                // Notify Auditor
                if (p.auditorId) {
                    await NotificationService.create(p.auditorId, 'overdue', 'Project Overdue', `Project ${p.name} is overdue!`, `/dashboard/auditor/projects/${p.id}`);
                }

                // Notify Manager of Customer if exists
                if (p.customer?.managerId) {
                    await NotificationService.create(p.customer.managerId, 'overdue', 'Project Overdue', `Managed project ${p.name} is overdue.`, `/dashboard/manager/projects/${p.id}`);
                }
            }

        } catch (error) {
            console.error('[DeadlineChecker] Error checking deadlines:', error);
        }
    }
}
