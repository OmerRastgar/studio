import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { NotificationService } from '../services/notification';

const router = Router();
const prisma = new PrismaClient();

// Apply auth middleware
router.use(authenticate as any);

// Helper: Get contacts a user can chat with based on their role
async function getAvailableContacts(userId: string, rawRole: string) {
    const userRole = rawRole?.toLowerCase();

    // Fetch full user details to know managerId and other links
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, managerId: true }
    });

    if (!currentUser) return [];

    console.log(`[Chat] getAvailableContacts called for userId=${userId} role=${userRole}`);

    switch (userRole) {
        case 'customer': {
            // Customers can chat with:
            // 1. Their Manager
            // 2. Assigned auditors (via projects)
            // 3. Admin (optional, but good for support)
            const customerContacts = await prisma.user.findMany({
                where: {
                    OR: [
                        { id: currentUser.managerId || '' }, // Their Manager
                        { role: 'admin' }, // Support
                        // Assigned auditors/reviewers
                        { auditorProjects: { some: { customerId: userId } } },
                        { reviewerProjects: { some: { customerId: userId } } },
                        // Existing conversations
                        {
                            conversationParticipants: {
                                some: {
                                    conversation: {
                                        participants: { some: { userId: userId } }
                                    }
                                }
                            }
                        }
                    ],
                    id: { not: userId }
                },
                select: {
                    id: true, name: true, email: true, avatarUrl: true, role: true, lastActive: true
                }
            });
            return customerContacts;
        }


        case 'auditor': {
            // Auditors can chat with:
            // 1. Their Manager
            // 2. Assigned customers
            // 3. Admin
            const auditorContacts = await prisma.user.findMany({
                where: {
                    OR: [
                        { id: currentUser.managerId || '' }, // Their Manager
                        { role: 'admin' },
                        // Assigned customers
                        { customerProjects: { some: { auditorId: userId } } },
                        { customerProjects: { some: { reviewerAuditorId: userId } } }
                    ],
                    id: { not: userId }
                },
                select: {
                    id: true, name: true, email: true, avatarUrl: true, role: true, lastActive: true
                }
            });
            return auditorContacts;
        }

        case 'manager': {
            // Managers can chat with:
            // 1. Admin
            // 2. Their created Users (Auditors, Customers, Compliance)
            // 3. Anyone reporting to them (managerId check)
            const managerContacts = await prisma.user.findMany({
                where: {
                    OR: [
                        { role: 'admin' },
                        { managerId: userId }, // Direct reports
                        { linkedCustomer: { managerId: userId } } // Linked compliance users
                    ],
                    id: { not: userId }
                },
                select: {
                    id: true, name: true, email: true, avatarUrl: true, role: true, lastActive: true
                }
            });
            return managerContacts;
        }

        case 'admin': {
            // Admins can chat with everyone
            const allContacts = await prisma.user.findMany({
                where: { id: { not: userId } },
                select: {
                    id: true, name: true, email: true, avatarUrl: true, role: true, lastActive: true
                }
            });
            return allContacts;
        }

        default:
            return [];
    }
}

// Check if a user can message another user
async function canMessageUser(senderId: string, senderRole: string, recipientId: string): Promise<boolean> {
    console.log(`[Chat] Checking if ${senderRole} ${senderId} can message ${recipientId}`);
    const contacts = await getAvailableContacts(senderId, senderRole);
    const canMessage = contacts.some((c: any) => c.id === recipientId);
    console.log(`[Chat] Can message: ${canMessage}`);
    return canMessage;
}

// GET /api/chat/contacts - Get available contacts for current user
router.get('/contacts', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const userRole = (req as any).user?.role;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const contacts = await getAvailableContacts(userId, userRole);
        res.json({ success: true, data: contacts });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

// GET /api/chat/conversations - Get all conversations for current user
router.get('/conversations', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: { userId: userId }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                                role: true,
                                lastActive: true
                            }
                        }
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Format response with other participant info and last message
        const formattedConversations = conversations.map(conv => {
            const otherParticipants = conv.participants
                .filter(p => p.userId !== userId)
                .map(p => p.user);

            const myParticipation = conv.participants.find(p => p.userId === userId);
            const lastMessage = conv.messages[0] || null;

            // Count unread messages
            const unreadCount = lastMessage && myParticipation?.lastReadAt
                ? (lastMessage.createdAt > myParticipation.lastReadAt ? 1 : 0)
                : (lastMessage ? 1 : 0);

            return {
                id: conv.id,
                participants: otherParticipants,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    createdAt: lastMessage.createdAt,
                    senderId: lastMessage.senderId
                } : null,
                unreadCount,
                updatedAt: conv.updatedAt
            };
        });

        res.json({ success: true, data: formattedConversations });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// POST /api/chat/conversations - Create or get existing conversation with a user
router.post('/conversations', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const userRole = (req as any).user?.role;
        const { recipientId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!recipientId) {
            return res.status(400).json({ error: 'Recipient ID is required' });
        }

        // Check if user can message the recipient
        const allowed = await canMessageUser(userId, userRole, recipientId);
        if (!allowed) {
            return res.status(403).json({ error: 'You cannot message this user' });
        }

        // Check if conversation already exists
        const existingConversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { userId: userId } } },
                    { participants: { some: { userId: recipientId } } }
                ]
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatarUrl: true, role: true }
                        }
                    }
                }
            }
        });

        if (existingConversation) {
            return res.json({ success: true, data: existingConversation });
        }

        // Create new conversation
        const newConversation = await prisma.conversation.create({
            data: {
                participants: {
                    create: [
                        { userId: userId },
                        { userId: recipientId }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true, avatarUrl: true, role: true }
                        }
                    }
                }
            }
        });

        res.json({ success: true, data: newConversation });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

// GET /api/chat/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { limit = 50, before } = req.query;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: id, userId: userId }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Not a participant of this conversation' });
        }

        // Get messages
        const whereClause: any = { conversationId: id };
        if (before) {
            whereClause.createdAt = { lt: new Date(before as string) };
        }

        const messages = await prisma.message.findMany({
            where: whereClause,
            include: {
                sender: {
                    select: { id: true, name: true, avatarUrl: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit as string)
        });

        // Update last read timestamp
        await prisma.conversationParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date() }
        });

        res.json({ success: true, data: messages.reverse() });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST /api/chat/conversations/:id/messages - Send a message (also handled via socket)
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;
        const { content } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // Verify user is a participant
        const participant = await prisma.conversationParticipant.findFirst({
            where: { conversationId: id, userId: userId }
        });

        if (!participant) {
            return res.status(403).json({ error: 'Not a participant of this conversation' });
        }

        // Create message
        const message = await prisma.message.create({
            data: {
                conversationId: id,
                senderId: userId,
                content: content.trim()
            },
            include: {
                sender: {
                    select: { id: true, name: true, avatarUrl: true }
                }
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        // Update sender's last read
        await prisma.conversationParticipant.update({
            where: { id: participant.id },
            data: { lastReadAt: new Date() }
        });

        // Notify other participants
        const otherParticipants = await prisma.conversationParticipant.findMany({
            where: {
                conversationId: id,
                userId: { not: userId }
            },
            select: { userId: true }
        });

        for (const p of otherParticipants) {
            await NotificationService.create(
                p.userId,
                'message',
                'New Message',
                `You have a new message from ${message.sender.name || 'User'}: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
                `/dashboard/messages?conversationId=${id}`
            );
        }

        res.json({ success: true, data: message });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// PUT /api/chat/conversations/:id/read - Mark conversation as read
router.put('/conversations/:id/read', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await prisma.conversationParticipant.updateMany({
            where: { conversationId: id, userId: userId },
            data: { lastReadAt: new Date() }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

// POST /api/chat/subscribe - Save push subscription
router.post('/subscribe', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const subscription = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: subscription as any }
        });


        res.json({ success: true });
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

export default router;
