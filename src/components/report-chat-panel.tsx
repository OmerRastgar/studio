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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ReportRow } from '@/app/(app)/reports/page';

interface ReportChatPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  reportRows: ReportRow[];
  onApplySuggestion: (rowId: string, field: keyof ReportRow, value: any) => void;
}

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isSuggestion?: boolean;
};

const initialMessages: Message[] = [
    {
      id: '1',
      text: 'Hello! How can I help you with this audit report?',
      sender: 'ai',
    },
    {
      id: '2',
      text: 'Based on the evidence, here is a more professional phrasing for the observation: "Quarterly access reviews for critical systems were not completed for the second quarter, representing a deviation from the established access control policy."',
      sender: 'ai',
      isSuggestion: true,
    },
];


export function ReportChatPanel({ isOpen, onOpenChange, reportRows, onApplySuggestion }: ReportChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

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

  const openApplyModal = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    if(reportRows.length > 0) {
        setSelectedRowId(reportRows[0].id);
    }
    setIsApplyModalOpen(true);
  };

  const handleApplySuggestion = () => {
    if (selectedRowId && selectedSuggestion) {
      onApplySuggestion(selectedRowId, 'observation', selectedSuggestion);
      setIsApplyModalOpen(false);
      setSelectedSuggestion(null);
      setSelectedRowId(null);
    }
  };

  return (
    <>
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
                <div key={message.id}>
                    <div
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
                  {message.isSuggestion && (
                    <div className="flex justify-start ml-11 mt-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="sm" onClick={() => openApplyModal(message.text)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Apply to Report
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Insert this suggestion into the report table.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
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

      <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Apply Suggestion to Report</DialogTitle>
                <DialogDescription>
                    Select a row to apply this AI suggestion to the 'Auditor Observation' column.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    <p><strong>Suggestion:</strong> "{selectedSuggestion}"</p>
                </div>
                <Select onValueChange={setSelectedRowId} value={selectedRowId || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a report row..." />
                    </SelectTrigger>
                    <SelectContent>
                        {reportRows.map(row => (
                            <SelectItem key={row.id} value={row.id}>
                                {row.control || `Row ID: ${row.id.substring(0, 6)}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                </DialogClose>
                <Button onClick={handleApplySuggestion} disabled={!selectedRowId}>Apply</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
