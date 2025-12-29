
import { PrismaClient } from '@prisma/client';
// import { getIO } from '../socket'; // Removed invalid import
// Actually socket.ts exports initializeSocket. I need a way to access IO.
// I will check socket.ts again. It returns io.
// But index.ts initializes it. I might need to export a singleton or pass it around.
// For now, let's assume I can import a singleton or similar.
// Looking at socket.ts, it exports initializeSocket.
// I should probably refactor socket.ts to export the `io` instance if it's already initialized, or use a getter.

// Let's modify socket.ts first to export a `getIO` function or similar.
// For now, I will write the service assuming `getIO` exists and then update socket.ts.

import { sendPushNotification } from '../lib/push';

const prisma = new PrismaClient();
let ioInstance: any;

export const setIO = (io: any) => {
    ioInstance = io;
};

export class NotificationService {
    static async create(userId: string, type: string, title: string, message: string, link?: string) {
        try {
            // 1. Save to DB
            const notification = await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title,
                    message,
                    link,
                    read: false
                }
            });

            // 2. Real-time Socket Emisison
            if (ioInstance) {
                ioInstance.to(`user:${userId}`).emit('new_notification', notification);
            }

            // 3. Push Notification (for urgent items or generally)
            // We can filter by type if needed, but for now send for all
            await sendPushNotification(userId, {
                title,
                body: message,
                url: link || '/dashboard',
                // icon: '/logo.png' // Optional
            });

            return notification;
        } catch (error) {
            console.error('[NotificationService] Error creating notification:', error);
            throw error;
        }
    }

    static async getForUser(userId: string, limit = 50) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    static async markAsRead(id: string, userId: string) {
        return prisma.notification.updateMany({
            where: { id, userId },
            data: { read: true }
        });
    }

    static async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
    }
}
