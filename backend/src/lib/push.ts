
import webpush from 'web-push';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Configure web-push
// Keys should remain secret and loaded from env
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (publicVapidKey && privateVapidKey) {
    webpush.setVapidDetails(
        vapidSubject,
        publicVapidKey,
        privateVapidKey
    );
} else {
    console.warn('[Push] VAPID keys not found. Push notifications will not work.');
}

export async function sendPushNotification(userId: string, data: { title: string; body: string; url?: string; icon?: string }) {
    if (!publicVapidKey || !privateVapidKey) return;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { pushSubscription: true }
        });

        if (!user?.pushSubscription) return;

        const subscription = user.pushSubscription as any;
        const payload = JSON.stringify(data);

        await webpush.sendNotification(subscription, payload);
        console.log(`[Push] Notification sent to user ${userId}`);
    } catch (error) {
        console.error(`[Push] Error sending notification to user ${userId}:`, error);
        // If 410 Gone, remove subscription?
        if ((error as any).statusCode === 410) {
            await prisma.user.update({
                where: { id: userId },
                data: { pushSubscription: Prisma.DbNull } // or null depending on Prisma version
            }).catch(e => console.error('Failed to remove expired subscription', e));
        }
    }
}
