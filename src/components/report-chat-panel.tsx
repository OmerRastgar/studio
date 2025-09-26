'use client';

import { useState } from 'react';
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
import { Send, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportChatPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
};

export function ReportChatPanel({ isOpen, onOpenChange }: ReportChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I help you with this audit report?',
      sender: 'ai',
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        text: "That's a great question. Let me look into that for you...",
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="p-6">
          <SheetTitle className="font-headline flex items-center gap-2">
            <Bot /> AI Report Assistant
          </SheetTitle>
          <SheetDescription>
            Ask questions, get explanations, or request help with your report.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-3',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex-shrink-0">
                    <AvatarFallback>
                      <Bot size={20}/>
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg p-3 text-sm',
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p>{message.text}</p>
                </div>
                 {message.sender === 'user' && (
                  <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground flex-shrink-0">
                    <AvatarFallback>
                      <User size={20}/>
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <SheetFooter className="p-6 bg-background border-t">
          <form onSubmit={handleSendMessage} className="flex w-full space-x-2">
            <Input
              type="text"
              placeholder="Ask the AI..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <Button type="submit" size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
