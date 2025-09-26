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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
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
import { Send, Bot, User, Edit, Users, Link as LinkIcon } from 'lucide-react';
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
  sender: 'user' | 'ai' | string; // sender can be a user name in team chat
  isSuggestion?: boolean;
};

type ChatMode = 'ai' | 'team';

const initialAiMessages: Message[] = [
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

const initialTeamMessages: Message[] = [
    {
        id: 'team-1',
        text: 'Can you double-check the evidence for the Access Control Policy?',
        sender: 'Jane Doe',
    },
    {
        id: 'team-2',
        text: 'On it. Looks correct on my end.',
        sender: 'user',
    }
];

const mockTeamMembers = [
    { id: 'user-jane', name: 'Jane Doe' },
    { id: 'user-john', name: 'John Smith' },
];


export function ReportChatPanel({ isOpen, onOpenChange, reportRows, onApplySuggestion }: ReportChatPanelProps) {
  const [aiMessages, setAiMessages] = useState<Message[]>(initialAiMessages);
  const [teamMessages, setTeamMessages] = useState<Message[]>(initialTeamMessages);
  const [inputValue, setInputValue] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ai');

  const currentMessages = chatMode === 'ai' ? aiMessages : teamMessages;
  const setCurrentMessages = chatMode === 'ai' ? setAiMessages : setTeamMessages;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: 'user',
    };

    setCurrentMessages(prev => [...prev, userMessage]);
    setInputValue('');

    if (chatMode === 'ai') {
        // Simulate AI response
        setTimeout(() => {
          const aiResponse: Message = {
            id: `msg-${Date.now() + 1}`,
            text: "That's a great question. Let me look into that for you...",
            sender: 'ai',
          };
          setAiMessages(prev => [...prev, aiResponse]);
        }, 1500);
    }
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

  const handleReferenceControl = (controlName: string) => {
    setInputValue(prev => `${prev} [Ref: ${controlName}] `.trimStart());
  }
  
  const getSenderInitials = (sender: string) => {
      if (sender === 'user') return 'You';
      if (sender === 'ai') return 'AI';
      return sender.split(' ').map(n => n[0]).join('');
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[480px] flex flex-col p-0">
          <SheetHeader className="p-6 pb-2">
            <SheetTitle className="font-headline flex items-center gap-2">
              <Bot /> AI Report Assistant
            </SheetTitle>
            <SheetDescription>
              Ask questions, get explanations, or collaborate with your team.
            </SheetDescription>
          </SheetHeader>

          <div className='px-6 py-2 border-b'>
             <div className="flex space-x-1 rounded-md bg-muted p-1">
                <Button variant={chatMode === 'ai' ? 'secondary' : 'ghost'} className="w-full" onClick={() => setChatMode('ai')}>
                    <Bot className="mr-2 h-4 w-4" />
                    AI Assistant
                </Button>
                <Button variant={chatMode === 'team' ? 'secondary' : 'ghost'} className="w-full" onClick={() => setChatMode('team')}>
                    <Users className="mr-2 h-4 w-4" />
                    Team Chat
                </Button>
            </div>
          </div>

           {chatMode === 'team' && (
             <div className="px-6 py-4 border-b">
                <Select defaultValue={mockTeamMembers[0].id}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select team members..." />
                    </SelectTrigger>
                    <SelectContent>
                        {mockTeamMembers.map(member => (
                            <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
           )}

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {currentMessages.map(message => (
                <div key={message.id}>
                    <div
                    className={cn(
                        'flex items-start gap-3',
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                    >
                    {message.sender !== 'user' && (
                        <Avatar className={cn(
                            "h-8 w-8 flex-shrink-0",
                            message.sender === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                        )}>
                        <AvatarFallback>
                           {getSenderInitials(message.sender)}
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
                        {message.sender !== 'user' && message.sender !== 'ai' && <p className="font-bold mb-1">{message.sender}</p>}
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
                  {message.isSuggestion && chatMode === 'ai' && (
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
              {chatMode === 'team' && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="icon">
                            <LinkIcon className="h-4 w-4" />
                            <span className="sr-only">Reference Control</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <h4 className="font-medium leading-none">Reference a Control</h4>
                            <p className="text-sm text-muted-foreground">
                                Select a control to reference in your message.
                            </p>
                            <div className="grid gap-2">
                                {reportRows.length > 0 ? reportRows.map(row => (
                                    <Button 
                                        key={row.id} 
                                        variant="ghost" 
                                        className="justify-start"
                                        onClick={() => handleReferenceControl(row.control)}
                                    >
                                        {row.control || `Row ID: ${row.id.substring(0,6)}`}
                                    </Button>
                                )) : <p className="text-sm text-muted-foreground">No controls in the report yet.</p>}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
              )}
              <Input
                type="text"
                placeholder={chatMode === 'ai' ? "Ask the AI..." : "Message your team..."}
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
