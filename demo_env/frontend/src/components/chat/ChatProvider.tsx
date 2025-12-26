'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/components/auth/kratos-auth-provider';

interface User {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    role: string;
    lastActive?: string | null;
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        avatarUrl?: string | null;
    };
}

interface Conversation {
    id: string;
    participants: User[];
    lastMessage?: {
        content: string;
        createdAt: string;
        senderId: string;
    } | null;
    unreadCount: number;
    updatedAt: string;
}

interface ChatContextType {
    socket: Socket | null;
    isConnected: boolean;
    contacts: User[];
    conversations: Conversation[];
    activeConversation: string | null;
    messages: Message[];
    unreadTotal: number;
    typingUsers: { [conversationId: string]: string[] };
    onlineUsers: Set<string>;

    // Actions
    openChat: (userId?: string) => void;
    closeChat: () => void;
    selectConversation: (id: string) => void;
    sendMessage: (content: string) => void;
    setTyping: (isTyping: boolean) => void;
    markAsRead: () => void;
    refreshContacts: () => void;
    isChatOpen: boolean;
    error: string | null;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChatContext must be used within ChatProvider');
    }
    return context;
}

// Safe version that returns null when not inside ChatProvider
export function useChatContextOptional() {
    return useContext(ChatContext);
}

interface ChatProviderProps {
    children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [contacts, setContacts] = useState<User[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [typingUsers, setTypingUsers] = useState<{ [key: string]: string[] }>({});
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, loading: authLoading } = useAuth();

    // Normalize API_URL to remove trailing /api if present
    const rawApiUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || '')
        : '';
    const API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl.slice(0, -4) : rawApiUrl;

    // Get auth token
    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    };

    // Calculate unread total
    const unreadTotal = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    // Refresh contacts with retry logic for expired tokens
    const fetchContacts = useCallback(async (retryCount = 0) => {
        // Wait for auth to finish loading
        if (authLoading) return;

        const token = getToken();
        if (!token) {
            console.log('[ChatProvider] No token available yet, skipping contacts fetch');
            return;
        }

        // Compliance role does not have chat access
        if (user?.role === 'compliance') return;

        try {
            console.log('Fetching contacts from:', `${API_URL}/api/chat/contacts`);
            const res = await fetch(`${API_URL}/api/chat/contacts`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log('Contacts fetched:', data.data?.length);
                console.log('Contacts data:', data.data);
                setContacts(data.data || []);
                setError(null);
            } else if (res.status === 401 && retryCount < 3) {
                // Token expired or not ready yet, wait and retry
                const delay = (retryCount + 1) * 500; // 500ms, 1s, 1.5s
                console.log(`Token not ready or expired, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
                setTimeout(() => fetchContacts(retryCount + 1), delay);
            } else {
                const errText = await res.text();
                console.error('Failed to fetch contacts:', res.status, errText);
                if (retryCount >= 3) {
                    setError(`Failed to load contacts: ${res.status} ${res.statusText}`);
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch contacts:', error);
            if (retryCount >= 3) {
                setError(`Network error loading contacts: ${error.message}`);
            }
        }
    }, [API_URL, authLoading, user?.role]);

    // Refresh conversations with retry logic
    const refreshConversations = useCallback(async (retryCount = 0) => {
        if (authLoading) return;

        const token = getToken();
        if (!token) {
            console.log('[ChatProvider] No token available yet, skipping conversations fetch');
            return;
        }

        // Compliance role does not have chat access
        if (user?.role === 'compliance') return;

        try {
            const res = await fetch(`${API_URL}/api/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setConversations(data.data || []);
            } else if (res.status === 401 && retryCount < 3) {
                // Token not ready or expired, wait and retry
                const delay = (retryCount + 1) * 500; // 500ms, 1s, 1.5s
                console.log(`[Conversations] Token not ready or expired, retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
                setTimeout(() => refreshConversations(retryCount + 1), delay);
            }
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        }
    }, [API_URL, authLoading, user?.role]);

    // Load messages for a conversation
    const loadMessages = useCallback(async (conversationId: string) => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    }, [API_URL]);

    // Initialize socket connection
    useEffect(() => {
        if (authLoading) return;

        const token = getToken();
        if (!token) return;

        // Compliance role does not have chat access
        if (user?.role === 'compliance') return;

        // Socket.IO connects directly to backend (not through Kong which doesn't proxy WebSockets)
        const SOCKET_URL = typeof window !== 'undefined' ? 'http://localhost:4000' : '';

        console.log('[ChatProvider] Initializing socket connection to:', SOCKET_URL);
        console.log('[ChatProvider] Token available:', !!token);

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('[ChatProvider] Socket connected successfully');
            setIsConnected(true);
            // We fetch on connect too, to ensure we have latest data after a reconnect
            fetchContacts();
            refreshConversations();
        });

        newSocket.on('disconnect', () => {
            console.log('[ChatProvider] Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('[ChatProvider] Socket connection error:', error);
        });

        newSocket.on('new_message', (data: { conversationId: string; message: Message }) => {
            // Update messages if this is the active conversation
            if (data.conversationId === activeConversation) {
                setMessages(prev => [...prev, data.message]);
            }
            // Refresh conversations to update last message
            refreshConversations();
        });

        newSocket.on('user_typing', (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => {
            setTypingUsers(prev => {
                const current = prev[data.conversationId] || [];
                if (data.isTyping) {
                    if (!current.includes(data.userName)) {
                        return { ...prev, [data.conversationId]: [...current, data.userName] };
                    }
                } else {
                    return { ...prev, [data.conversationId]: current.filter(n => n !== data.userName) };
                }
                return prev;
            });
        });

        newSocket.on('user_online', (data: { userId: string }) => {
            setOnlineUsers(prev => new Set([...prev, data.userId]));
        });

        newSocket.on('user_offline', (data: { userId: string }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(data.userId);
                return next;
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [API_URL, activeConversation, fetchContacts, refreshConversations]);

    // Initial data fetch (independent of socket)
    useEffect(() => {
        if (!authLoading) {
            fetchContacts();
            refreshConversations();
        }
    }, [fetchContacts, refreshConversations, authLoading]);

    // Load messages when active conversation changes
    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation);
            socket?.emit('join_conversation', { conversationId: activeConversation });
        }
    }, [activeConversation, loadMessages, socket]);

    // Open chat panel, optionally starting a conversation with a user
    const openChat = useCallback(async (userId?: string) => {
        console.log('openChat called with userId:', userId);
        setIsChatOpen(true);

        if (userId) {
            const token = getToken();
            if (!token) {
                console.error('No token found in openChat');
                return;
            }

            try {
                console.log('Fetching conversation for recipient:', userId);
                // Create or get conversation with this user
                const res = await fetch(`${API_URL}/api/chat/conversations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ recipientId: userId })
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log('Conversation created/found:', data);
                    setActiveConversation(data.data.id);
                    refreshConversations();
                } else {
                    console.error('Failed to create conversation. Status:', res.status);
                    const err = await res.text();
                    console.error('Error body:', err);
                }
            } catch (error) {
                console.error('Failed to open conversation:', error);
            }
        }
    }, [API_URL, refreshConversations]);

    const closeChat = useCallback(() => {
        setIsChatOpen(false);
    }, []);

    const selectConversation = useCallback((id: string) => {
        setActiveConversation(id);
    }, []);

    const sendMessage = useCallback((content: string) => {
        console.log('[ChatProvider] sendMessage called with:', { content, hasSocket: !!socket, activeConversation, trimmed: content.trim() });

        if (!socket || !activeConversation || !content.trim()) {
            console.warn('[ChatProvider] Cannot send message:', {
                hasSocket: !!socket,
                hasConversation: !!activeConversation,
                hasContent: !!content.trim()
            });
            return;
        }

        console.log('[ChatProvider] Emitting send_message event to socket');
        socket.emit('send_message', {
            conversationId: activeConversation,
            content: content.trim()
        });
    }, [socket, activeConversation]);

    const setTyping = useCallback((isTyping: boolean) => {
        if (!socket || !activeConversation) return;
        socket.emit('typing', { conversationId: activeConversation, isTyping });
    }, [socket, activeConversation]);

    const markAsRead = useCallback(() => {
        if (!socket || !activeConversation) return;
        socket.emit('mark_read', { conversationId: activeConversation });

        // Update local state
        setConversations(prev => prev.map(c =>
            c.id === activeConversation ? { ...c, unreadCount: 0 } : c
        ));
    }, [socket, activeConversation]);

    return (
        <ChatContext.Provider value={{
            socket,
            isConnected,
            contacts,
            conversations,
            activeConversation,
            messages,
            unreadTotal,
            typingUsers,
            onlineUsers,
            openChat,
            closeChat,
            selectConversation,
            sendMessage,
            setTyping,
            markAsRead,
            refreshContacts: fetchContacts,
            isChatOpen,
            error
        }}>
            {children}
        </ChatContext.Provider>
    );
}
