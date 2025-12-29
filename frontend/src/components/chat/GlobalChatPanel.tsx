'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatContext } from './ChatProvider';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    MessageCircle,
    Send,
    ArrowLeft,
    Circle,
    Users,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function GlobalChatPanel() {
    const {
        isChatOpen,
        closeChat,
        contacts,
        conversations,
        activeConversation,
        messages,
        typingUsers,
        onlineUsers,
        selectConversation,
        sendMessage,
        setTyping,
        markAsRead,
        openChat,
        unreadTotal,
        error
    } = useChatContext();

    const [inputValue, setInputValue] = useState('');
    const [showContacts, setShowContacts] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Mark as read when viewing a conversation
    useEffect(() => {
        if (activeConversation && isChatOpen) {
            markAsRead();
        }
    }, [activeConversation, isChatOpen, markAsRead]);

    // Filter contacts by search
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.email.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.role.toLowerCase().includes(contactSearch.toLowerCase())
    );

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        sendMessage(inputValue);
        setInputValue('');
        setTyping(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);

        // Handle typing indicator
        setTyping(true);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
        }, 2000);
    };

    const handleContactClick = (userId: string) => {
        openChat(userId);
        setShowContacts(false);
        setContactSearch('');
    };

    const handleConversationClick = (convId: string) => {
        selectConversation(convId);
    };

    const handleBack = () => {
        if (activeConversation) {
            selectConversation('');
        } else if (showContacts) {
            setShowContacts(false);
        }
    };

    // Get active conversation details
    const activeConv = conversations.find(c => c.id === activeConversation);
    const otherUser = activeConv?.participants[0];
    const currentTyping = activeConversation ? typingUsers[activeConversation] : [];

    // Get current user ID from localStorage
    const getCurrentUserId = () => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    return JSON.parse(storedUser).id;
                } catch {
                    return null;
                }
            }
        }
        return null;
    };

    const currentUserId = getCurrentUserId();

    return (
        <Sheet open={isChatOpen} onOpenChange={(open) => !open && closeChat()}>
            <SheetContent className="w-full sm:w-[420px] h-[100dvh] sm:h-full flex flex-col p-0 gap-0">
                <SheetHeader className="p-4 border-b flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        {(activeConversation || showContacts) && (
                            <Button variant="ghost" size="icon" onClick={handleBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <div>
                            <SheetTitle className="font-headline flex items-center gap-2">
                                {activeConversation ? (
                                    <>
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={otherUser?.avatarUrl || ''} />
                                            <AvatarFallback className="text-xs">
                                                {otherUser ? getInitials(otherUser.name) : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{otherUser?.name}</span>
                                        {otherUser && onlineUsers.has(otherUser.id) && (
                                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                                        )}
                                    </>
                                ) : showContacts ? (
                                    <>
                                        <Users className="h-5 w-5" />
                                        <span>New Conversation</span>
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="h-5 w-5" />
                                        <span>Messages</span>
                                        {unreadTotal > 0 && (
                                            <Badge variant="destructive" className="ml-2">{unreadTotal}</Badge>
                                        )}
                                    </>
                                )}
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                {activeConversation ? `Chat with ${otherUser?.name}` : 'Your conversations'}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1" ref={scrollRef}>
                    {activeConversation ? (
                        // Messages view
                        <div className="p-4 space-y-4">
                            {messages.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-8">
                                    No messages yet. Say hello!
                                </p>
                            ) : (
                                messages.map((message) => {
                                    const isMe = message.senderId === currentUserId;
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                'flex items-start gap-2',
                                                isMe ? 'flex-row-reverse' : 'flex-row'
                                            )}
                                        >
                                            {!isMe && (
                                                <Avatar className="h-8 w-8 flex-shrink-0">
                                                    <AvatarImage src={message.sender.avatarUrl || ''} />
                                                    <AvatarFallback className="text-xs">
                                                        {getInitials(message.sender.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn(
                                                'max-w-[70%] rounded-lg p-3',
                                                isMe
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                            )}>
                                                <p className="text-sm">{message.content}</p>
                                                <p className={cn(
                                                    'text-xs mt-1',
                                                    isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                                )}>
                                                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {/* Typing indicator */}
                            {currentTyping && currentTyping.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="animate-pulse">{currentTyping.join(', ')} typing...</span>
                                </div>
                            )}
                        </div>
                    ) : showContacts ? (
                        // Contacts list with search
                        <div className="flex flex-col h-full">

                            {/* Search input */}
                            <div className="p-4 border-b">
                                <Input
                                    type="text"
                                    placeholder="Search contacts by name, email, or role..."
                                    value={contactSearch}
                                    onChange={(e) => setContactSearch(e.target.value)}
                                    className="w-full"
                                />
                                {error && (
                                    <div className="mt-2 p-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-200 dark:border-red-900">
                                        Server Error: {error}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                    {filteredContacts.length} of {contacts.length} contacts
                                </p>
                            </div>
                            <div className="divide-y flex-1 overflow-auto">
                                {filteredContacts.length === 0 ? (
                                    <p className="text-center text-muted-foreground text-sm py-8">
                                        {contacts.length === 0 ? 'No contacts available' : 'No contacts match your search'}
                                    </p>
                                ) : (
                                    filteredContacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => handleContactClick(contact.id)}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left"
                                        >
                                            <div className="relative">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={contact.avatarUrl || ''} />
                                                    <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                                                </Avatar>
                                                {onlineUsers.has(contact.id) && (
                                                    <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{contact.name}</p>
                                                <p className="text-sm text-muted-foreground">{contact.email}</p>
                                                <Badge variant="secondary" className="mt-1 capitalize">{contact.role}</Badge>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        // Conversations list
                        <div className="divide-y">
                            {/* New conversation button */}
                            <button
                                onClick={() => setShowContacts(true)}
                                className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left border-b-2 border-primary/20"
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-primary">Start New Conversation</p>
                                </div>
                            </button>

                            {conversations.length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-8">
                                    No conversations yet
                                </p>
                            ) : (
                                conversations.map((conv) => {
                                    const participant = conv.participants[0];
                                    const isOnline = participant && onlineUsers.has(participant.id);
                                    return (
                                        <button
                                            key={conv.id}
                                            onClick={() => handleConversationClick(conv.id)}
                                            className={cn(
                                                'w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors text-left',
                                                conv.unreadCount > 0 && 'bg-primary/5'
                                            )}
                                        >
                                            <div className="relative">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={participant?.avatarUrl || ''} />
                                                    <AvatarFallback>
                                                        {participant ? getInitials(participant.name) : '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {isOnline && (
                                                    <Circle className="absolute bottom-0 right-0 h-3 w-3 fill-green-500 text-green-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className={cn(
                                                        'font-medium truncate',
                                                        conv.unreadCount > 0 && 'font-bold'
                                                    )}>
                                                        {participant?.name || 'Unknown'}
                                                    </p>
                                                    {conv.lastMessage && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm text-muted-foreground truncate">
                                                        {conv.lastMessage?.content || 'No messages'}
                                                    </p>
                                                    {conv.unreadCount > 0 && (
                                                        <Badge variant="destructive" className="ml-2">
                                                            {conv.unreadCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Message input - only show when in active conversation */}
                {activeConversation && (
                    <SheetFooter className="p-4 border-t">
                        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
                            <Input
                                type="text"
                                placeholder="Type a message..."
                                value={inputValue}
                                onChange={handleInputChange}
                                className="flex-1"
                            />
                            <Button type="submit" size="icon" disabled={!inputValue.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

// Floating chat button component
export function ChatButton() {
    const { openChat, unreadTotal, isConnected } = useChatContext();

    return (
        <button
            onClick={() => openChat()}
            className={cn(
                'fixed bottom-6 right-6 z-50',
                'h-14 w-14 rounded-full shadow-lg',
                'bg-primary text-primary-foreground',
                'flex items-center justify-center',
                'hover:scale-105 transition-transform',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
            aria-label={`Open chat ${unreadTotal > 0 ? `(${unreadTotal} unread)` : ''}`}
        >
            <MessageCircle className="h-6 w-6" />
            {unreadTotal > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
            )}
            {!isConnected && (
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
            )}
        </button>
    );
}
