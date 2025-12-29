
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/kratos-auth-provider';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

export type Notification = {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    createdAt: string;
};

export const useNotifications = () => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [socket, setSocket] = useState<Socket | null>(null);

    // Initial fetch
    useEffect(() => {
        if (!user || !token) return;

        fetchNotifications();
    }, [user, token]);

    // Socket connection
    useEffect(() => {
        if (!user || !token) return;

        // Use API_URL root or default to current origin (for Kong/Gateway)
        const socketUrl = process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
            : '';

        // If empty, io() connects to window.location.origin which is correct if served from same domain

        const newSocket = io(socketUrl, {
            path: '/socket.io',
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('[Notifications] Socket connected');
        });

        newSocket.on('new_notification', (notification: Notification) => {
            console.log('[Notifications] Received:', notification);
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            toast.info(notification.title, {
                description: notification.message,
                action: notification.link ? {
                    label: 'View',
                    onClick: () => window.location.href = notification.link! // Simple nav
                } : undefined
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user, token]);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.data.filter((n: Notification) => !n.read).length);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to mark read:', error);
        }
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to mark all read:', error);
        }
    };

    return {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead
    };
};
