import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    userRole?: string;
    userName?: string;
}

export function initializeSocket(httpServer: HTTPServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: [
                'http://localhost:3000',
                'http://localhost:8000',
                'https://demo.cybergaar.com',
                process.env.PUBLIC_URL || ''
            ].filter(Boolean),
            methods: ['GET', 'POST'],
            credentials: true
        },
        path: '/socket.io'
    });

    // Authentication middleware
    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        console.log('[Socket Auth] Authenticating socket connection, has token:', !!token);

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token as string, JWT_SECRET) as any;
            console.log('[Socket Auth] Decoded JWT:', decoded);
            socket.userId = decoded.userId || decoded.id || decoded.sub;
            socket.userRole = decoded.role;
            socket.userName = decoded.name;
            console.log('[Socket Auth] Set socket userId:', socket.userId, 'role:', socket.userRole);
            next();
        } catch (err) {
            console.error('[Socket Auth] JWT verification failed:', err);
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', async (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;
        const userRole = socket.userRole!;

        console.log(`User connected: ${socket.userName} (${userId})`);

        // Join user's personal room for direct notifications
        socket.join(`user:${userId}`);

        // Update user's last active
        await prisma.user.update({
            where: { id: userId },
            data: { lastActive: new Date() }
        }).catch(() => { });

        // Join all conversation rooms user is part of
        const participations = await prisma.conversationParticipant.findMany({
            where: { userId },
            select: { conversationId: true }
        });

        participations.forEach(p => {
            socket.join(`conversation:${p.conversationId}`);
        });

        // Broadcast online status to relevant users
        socket.broadcast.emit('user_online', { userId });

        // Handle sending a message
        socket.on('send_message', async (data: { conversationId: string; content: string }) => {
            console.log('[Socket] Received send_message event from user:', socket.userName, 'Data:', data);
            console.log('[Socket] Socket userId:', userId, 'socket.userId:', socket.userId);
            try {
                const { conversationId, content } = data;

                if (!content || content.trim() === '') {
                    console.log('[Socket] Empty content, ignoring');
                    return;
                }

                // Verify participant
                console.log('[Socket] Verifying participant for conversation:', conversationId);
                const participant = await prisma.conversationParticipant.findFirst({
                    where: { conversationId, userId }
                });

                if (!participant) {
                    console.log('[Socket] User is not a participant');
                    socket.emit('error', { message: 'Not a participant' });
                    return;
                }

                console.log('[Socket] Creating message in database');
                // Create message
                const message = await prisma.message.create({
                    data: {
                        conversationId: conversationId,
                        senderId: userId,
                        content: content.trim()
                    },
                    include: {
                        sender: {
                            select: { id: true, name: true, avatarUrl: true }
                        }
                    }
                });

                console.log('[Socket] Message created:', message.id);

                // Update conversation timestamp
                await prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() }
                });

                // Update sender's last read
                await prisma.conversationParticipant.update({
                    where: { id: participant.id },
                    data: { lastReadAt: new Date() }
                });

                console.log('[Socket] Broadcasting new_message to conversation room');
                // Broadcast to all participants in the conversation
                io.to(`conversation:${conversationId}`).emit('new_message', {
                    conversationId,
                    message
                });
                console.log('[Socket] Message broadcast complete');
            } catch (error) {
                console.error('[Socket] Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Handle typing indicator
        socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
                conversationId: data.conversationId,
                userId,
                userName: socket.userName,
                isTyping: data.isTyping
            });
        });

        // Handle joining a conversation room
        socket.on('join_conversation', async (data: { conversationId: string }) => {
            const participant = await prisma.conversationParticipant.findFirst({
                where: { conversationId: data.conversationId, userId }
            });

            if (participant) {
                socket.join(`conversation:${data.conversationId}`);
            }
        });

        // Handle marking messages as read
        socket.on('mark_read', async (data: { conversationId: string }) => {
            try {
                await prisma.conversationParticipant.updateMany({
                    where: { conversationId: data.conversationId, userId },
                    data: { lastReadAt: new Date() }
                });

                // Notify other participants that messages were read
                socket.to(`conversation:${data.conversationId}`).emit('messages_read', {
                    conversationId: data.conversationId,
                    userId
                });
            } catch (error) {
                console.error('Mark read error:', error);
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.userName}`);

            // Update last active
            await prisma.user.update({
                where: { id: userId },
                data: { lastActive: new Date() }
            }).catch(() => { });

            socket.broadcast.emit('user_offline', { userId });
        });
    });

    return io;
}
