
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
import { Send, Bot, User, Edit, Link as LinkIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ReportRow } from '@/app/(app)/reports/page';
// import { mockEvidence } from '@/lib/data-build';
const mockEvidence: any[] = [];

interface ReportChatPanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  reportRows: ReportRow[];
  onApplySuggestion: (rowId: string, field: keyof ReportRow, value: any) => void;
  onReferenceClick: (rowId: string) => void;
  standardName: string;
  onTrackActivity: (type: 'chat') => void;
}

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isSuggestion?: boolean;
};

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

export function ReportChatPanel({
  isOpen,
  onOpenChange,
  reportRows,
  onApplySuggestion,
  onReferenceClick,
  standardName,
  onTrackActivity
}: ReportChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialAiMessages);
  const [inputValue, setInputValue] = useState('');
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: 'user',
    };

    onTrackActivity('chat');

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsAiThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const controlRefMatch = userMessage.text.match(/\[Ref: (.*?)\]/);
      let aiText = "That's a great question. Let me look into that for you...";

      if (controlRefMatch) {
        const controlName = controlRefMatch[1];
        const referencedRow = reportRows.find(r => r.control === controlName);

        if (referencedRow) {
          // Context Extraction
          const evidenceNames = referencedRow.evidence.map(e => e.fileName).join(', ') || 'None';
          const reviewerNotes = referencedRow.reviewerNotes || 'None';
          const observation = referencedRow.observation || 'No observation recorded yet.';

          aiText = `I see you are referring to **${controlName}** from the **${standardName}** standard.\n\n` +
            `Here is the context I have:\n` +
            `- **Observation**: "${observation}"\n` +
            `- **Evidence**: ${evidenceNames}\n` +
            `- **Reviewer Notes**: "${reviewerNotes}"\n\n` +
            `Based on this, how would you like me to assist?`;

        } else {
          aiText = `I couldn't find a control named "${controlName}" in your report. Please make sure the name is correct.`;
        }
      }

      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        text: aiText,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsAiThinking(false);
    }, 1500);
  };

  const openApplyModal = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    if (reportRows.length > 0) {
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

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\[Ref: .*?\])/g);
    // Basic Markdown bold support for the context message
    const parseBold = (str: string) => {
      const boldParts = str.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bp, bIdx) => {
        if (bp.startsWith('**') && bp.endsWith('**')) {
          return <strong key={bIdx}>{bp.slice(2, -2)}</strong>;
        }
        return bp;
      });
    };

    return parts.map((part, index) => {
      const match = part.match(/\[Ref: (.*?)\]/);
      if (match) {
        const controlName = match[1];
        const row = reportRows.find(r => r.control === controlName);
        if (row) {
          return (
            <Button
              key={index}
              variant="link"
              className="p-0 h-auto text-base text-primary dark:text-blue-400 align-baseline"
              onClick={() => onReferenceClick(row.id)}
            >
              {controlName}
            </Button>
          );
        }
      }
      return <span key={index} className="whitespace-pre-wrap">{parseBold(part)}</span>;
    });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[500px] flex flex-col p-0">
          <SheetHeader className="p-6 border-b bg-muted/10">
            <SheetTitle className="font-headline flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Report Copilot
            </SheetTitle>
            <SheetDescription>
              I can help you draft observations, analyze evidence, and review controls.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 bg-muted/5">
            <div className="space-y-6 py-6">
              {messages.map(message => (
                <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div
                    className={cn(
                      'flex items-start gap-3',
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.sender === 'ai' && (
                      <Avatar className="h-8 w-8 flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                        <AvatarFallback><Bot size={18} /></AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-background border rounded-bl-none'
                      )}
                    >
                      <div className="leading-relaxed">
                        {renderMessageText(message.text)}
                      </div>
                    </div>

                    {message.sender === 'user' && (
                      <Avatar className="h-8 w-8 bg-secondary text-secondary-foreground flex-shrink-0">
                        <AvatarFallback>
                          <User size={18} />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {message.isSuggestion && (
                    <div className="flex justify-start ml-11 mt-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2 bg-background" onClick={() => openApplyModal(message.text)}>
                              <Edit className="h-3.5 w-3.5" />
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

              {isAiThinking && (
                <div className="flex items-start gap-3 justify-start animate-pulse">
                  <Avatar className="h-8 w-8 flex-shrink-0 bg-primary/10 text-primary">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl px-4 py-3 bg-muted flex items-center gap-2 rounded-bl-none">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="p-4 bg-background border-t">
            <form onSubmit={handleSendMessage} className="flex w-full gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0" title="Reference a Control">
                    <LinkIcon className="h-4 w-4" />
                    <span className="sr-only">Reference Control</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <div className="flex flex-col max-h-[300px]">
                    <div className="p-3 border-b bg-muted/20">
                      <h4 className="font-medium text-sm">Reference a Control</h4>
                      <p className="text-xs text-muted-foreground">
                        Select a control to add context to your query.
                      </p>
                    </div>
                    <ScrollArea className="h-72">
                      <div className="p-2 grid gap-1">
                        {reportRows.length > 0 ? reportRows.map(row => (
                          <Button
                            key={row.id}
                            variant="ghost"
                            className="justify-start h-auto py-2 px-3 text-left font-normal"
                            onClick={() => handleReferenceControl(row.control)}
                          >
                            <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                              <span className="truncate text-xs font-semibold">{row.control.split(':')[0]}</span>
                              <span className="truncate text-xs text-muted-foreground">{row.control.split(':').slice(1).join(':') || 'No title'}</span>
                            </div>
                          </Button>
                        )) : <div className="p-4 text-center text-sm text-muted-foreground">No controls available.</div>}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Ask about this report..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  disabled={isAiThinking}
                  className="pr-10"
                />
              </div>

              <Button type="submit" size="icon" disabled={isAiThinking || !inputValue.trim()}>
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
            <DialogTitle>Apply Suggestion</DialogTitle>
            <DialogDescription>
              Choose where to apply this suggestion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-md text-sm border">
              <p className="font-medium mb-1 text-xs uppercase text-muted-foreground">From AI:</p>
              <p>"{selectedSuggestion}"</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Target Control</label>
              <Select onValueChange={setSelectedRowId} value={selectedRowId || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a control row..." />
                </SelectTrigger>
                <SelectContent>
                  {reportRows.map(row => (
                    <SelectItem key={row.id} value={row.id}>
                      <span className="font-mono text-xs mr-2">{row.control.split(':')[0]}</span>
                      <span className="truncate block max-w-[250px]">{row.control.split(':').slice(1).join(':')}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleApplySuggestion} disabled={!selectedRowId}>Apply Suggestion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
