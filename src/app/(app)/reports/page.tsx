

'use client';

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileQuestion, MessageSquare, PlusCircle, Sparkles, Trash2, Loader2, Flag, FileDown, MessageCircle, CheckCircle, X, ChevronsUpDown, ShieldCheck, HelpCircle, Briefcase } from 'lucide-react';
import { mockProjects, mockEvidence } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ReportChatPanel } from '@/components/report-chat-panel';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { reviewReport } from '@/ai/flows/review-report';
import { useGuide } from '@/components/guide';
import { reportGenerationTourSteps } from '@/lib/guide-steps';

export type ReportRow = {
  id: string;
  control: string;
  observation: string;
  evidence: string[];
  analysis: string;
  isGenerating: boolean;
  isFlagged: boolean;
  isResolved: boolean;
  flagComment?: string;
};

const sampleReportData: Omit<ReportRow, 'id' | 'isGenerating' | 'isFlagged' | 'isResolved'>[] = [
  {
    control: 'Access Control Policy',
    observation: 'The company has a documented access control policy that is reviewed annually.',
    evidence: ['EV001'],
    analysis: '',
  },
  {
    control: 'Quarterly Access Reviews',
    observation: 'Access reviews for critical systems were not completed for Q2.',
    evidence: ['EV002', 'EV003'],
    analysis: '',
  },
  {
    control: 'Data Encryption',
    observation: 'All production databases are encrypted at rest using AES-256.',
    evidence: [],
    analysis: '',
  },
];

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState(mockProjects[0].id);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const { toast } = useToast();
  const [isQaRunning, setIsQaRunning] = useState(false);
  const { startTour } = useGuide();

  // State for the flag/comment dialog
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    rowId: string | null;
    isFlagging: boolean; // true if we are adding a flag, false if we are resolving
    comment: string;
  }>({ isOpen: false, rowId: null, isFlagging: true, comment: '' });


  useEffect(() => {
    if (highlightedRow) {
      const timer = setTimeout(() => setHighlightedRow(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedRow]);

  const projectEvidence = mockEvidence.filter(e => e.projectId === selectedProject);

  const loadSampleData = () => {
    setReportRows(
      sampleReportData.map((row, index) => ({
        ...row,
        id: `sample-${index}-${Date.now()}`,
        isGenerating: false,
        isFlagged: false,
        isResolved: false,
      }))
    );
    toast({
      title: 'Sample Template Loaded',
      description: 'The report table has been populated with sample data.',
    });
    // Start the tour after a short delay to allow the UI to update
    setTimeout(() => {
        startTour(reportGenerationTourSteps, 'reportGenTour', true);
    }, 500);
  };

  const addRow = () => {
    setReportRows([
      ...reportRows,
      {
        id: `row-${Date.now()}`,
        control: '',
        observation: '',
        evidence: [],
        analysis: '',
        isGenerating: false,
        isFlagged: false,
        isResolved: false,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setReportRows(reportRows.filter(row => row.id !== id));
  };
  
  const handleGenerate = (id: string) => {
    setReportRows(rows => rows.map(row => row.id === id ? { ...row, isGenerating: true, analysis: '' } : row));

    // Simulate AI generation
    setTimeout(() => {
        setReportRows(rows => rows.map(row => {
            if (row.id === id) {
                return { 
                    ...row, 
                    isGenerating: false, 
                    analysis: 'AI analysis complete: The evidence provided supports the observation, indicating compliance with the specified control. Recommendation: Continue quarterly reviews and document outcomes consistently.' 
                };
            }
            return row;
        }));
        toast({
            title: "Analysis Complete",
            description: "AI has generated the detailed analysis for the control."
        })
    }, 2000);
  };

  const handleEvidenceChange = (rowId: string, evidenceId: string) => {
    setReportRows(reportRows.map(row => {
        if (row.id === rowId) {
            const newEvidence = row.evidence.includes(evidenceId)
                ? row.evidence.filter(e => e !== evidenceId)
                : [...row.evidence, evidenceId];
            return { ...row, evidence: newEvidence };
        }
        return row;
    }));
  };

   const updateReportRow = (rowId: string, field: keyof ReportRow, value: any) => {
    setReportRows(prev =>
      prev.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
    toast({
      title: 'Report Updated',
      description: `The '${rowId}' row has been updated.`
    })
  };

  const handleControlChange = (rowId: string, newControl: string) => {
    setReportRows(rows => rows.map(row => (row.id === rowId ? { ...row, control: newControl } : row)));
  };

  const handleObservationChange = (rowId: string, newObservation: string) => {
    setReportRows(rows => rows.map(row => (row.id === rowId ? { ...row, observation: newObservation } : row)));
  };

  // Opens the dialog to either flag (and comment) or resolve a flag
  const handleFlagButtonClick = (row: ReportRow) => {
    if (row.isFlagged) {
      // If already flagged, open dialog in "resolve" mode
      setDialogState({
        isOpen: true,
        rowId: row.id,
        isFlagging: false,
        comment: row.flagComment || '',
      });
    } else {
      // If not flagged, open dialog in "flagging" mode
      setDialogState({
        isOpen: true,
        rowId: row.id,
        isFlagging: true,
        comment: '',
      });
    }
  };

  // Handles the submission from the flag/comment dialog
  const submitFlagDialog = () => {
    const { rowId, isFlagging, comment } = dialogState;
    if (!rowId) return;

    if (isFlagging) {
      // Logic to add a new flag
      if (comment.trim() === '') {
        toast({
          variant: 'destructive',
          title: 'Comment required',
          description: 'Please provide a reason for flagging this row.',
        });
        return;
      }
      setReportRows(rows =>
        rows.map(row =>
          row.id === rowId
            ? { ...row, isFlagged: true, isResolved: false, flagComment: comment }
            : row
        )
      );
      toast({ title: 'Row Flagged', description: 'The item has been flagged for review.' });
    } else {
      // This case is now handled by the resolve button in the dialog
    }
    setDialogState({ isOpen: false, rowId: null, isFlagging: true, comment: '' }); // Reset and close
  };

  const resolveFlag = (rowId: string | null) => {
    if (!rowId) return;
    setReportRows(rows =>
      rows.map(row =>
        row.id === rowId ? { ...row, isFlagged: false, isResolved: true } : row
      )
    );
    toast({ title: 'Flag Resolved', description: 'The item has been marked as resolved.' });
    setDialogState({ isOpen: false, rowId: null, isFlagging: true, comment: '' }); // Reset and close
  };
  

  const handleAiQa = async () => {
    setIsQaRunning(true);
    toast({
        title: "AI QA in Progress",
        description: "The AI is reviewing the report for quality and consistency.",
    });

    try {
        const qaReportRows = reportRows.map(row => {
          const evidenceDetails = row.evidence
            .map(id => {
              const evidence = mockEvidence.find(e => e.id === id);
              if (!evidence) return null;
              return {
                name: evidence.name,
                type: evidence.type,
                tags: evidence.tags,
              };
            })
            .filter((e): e is NonNullable<typeof e> => e !== null);

          return {
            id: row.id,
            control: row.control,
            observation: row.observation,
            evidence: evidenceDetails,
          };
        });

        const result = await reviewReport({ reportRows: qaReportRows });

        // Flag rows with issues found by the AI
        result.issues.forEach(issue => {
            const comment = `AI Issue: ${issue.issue}\n\nSuggestion: ${issue.suggestion}`;
            setReportRows(rows => rows.map(r => r.id === issue.rowId ? { ...r, isFlagged: true, isResolved: false, flagComment: comment } : r));
        });
        
        toast({
            title: "AI QA Complete",
            description: `Found and flagged ${result.issues.length} potential issues.`,
        });

    } catch (error) {
        console.error("AI QA failed:", error);
        toast({
            variant: "destructive",
            title: "AI QA Failed",
            description: "Could not complete the report review.",
        });
    } finally {
        setIsQaRunning(false);
    }
  };

  const currentProjectDetails = mockProjects.find(p => p.id === selectedProject);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline">AI-Assisted Report Generation</CardTitle>
            <CardDescription>Select a project and build your audit report.</CardDescription>
            {currentProjectDetails && (
              <div className="flex items-center gap-2 mt-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentProjectDetails.customerName}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject} data-tour-id="report-project-selector">
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                    {mockProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Dialog>
                <DialogTrigger asChild>
                     <Button variant="outline">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Project
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                           Provide customer and project details. This context will be used by the AI.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="project-name" className="text-right">Project Name</Label>
                            <Input id="project-name" placeholder="e.g. Q3 Security Audit" className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="customer-name" className="text-right">Customer Name</Label>
                            <Input id="customer-name" placeholder="e.g. Innovate Inc." className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="company-size" className="text-right">Company Size</Label>
                             <Select>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select company size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="small">Small (1-50 employees)</SelectItem>
                                    <SelectItem value="medium">Medium (51-500 employees)</SelectItem>
                                    <SelectItem value="large">Large (501-5000 employees)</SelectItem>
                                    <SelectItem value="enterprise">Enterprise (5000+ employees)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="service-offering" className="text-right">Service Offering</Label>
                            <Textarea id="service-offering" placeholder="Briefly describe the customer's main product or service (e.g., 'B2B SaaS for financial planning')." className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Create Project</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                    <DropdownMenuItem>Export as DOCX</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={() => setIsChatOpen(true)} data-tour-id="report-chat-button">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
            </Button>
            <Button variant="secondary" onClick={loadSampleData}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Load Sample
            </Button>
             <Button onClick={handleAiQa} disabled={isQaRunning} data-tour-id="report-ai-qa-button">
                {isQaRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                AI QA
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-x-auto" data-tour-id="report-table">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[20%]">Controls</TableHead>
                        <TableHead className="w-[25%]">Auditor Observation</TableHead>
                        <TableHead className="w-[15%]">Select Evidence</TableHead>
                        <TableHead className="w-[30%]">AI Detailed Analysis</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportRows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                                 <div className="flex flex-col items-center justify-center text-muted-foreground">
                                    <Bot className="h-12 w-12" />
                                    <p className="mt-4 font-medium">Your report is empty.</p>
                                    <p className="text-sm mt-1">Add a row or load a sample template to get started.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        reportRows.map((row, index) => (
                            <TableRow key={row.id} className={cn("align-top transition-colors duration-500", 
                                highlightedRow === row.id ? 'bg-primary/20' : '',
                                row.isFlagged ? 'bg-orange-100 dark:bg-orange-900/30' : '',
                                row.isResolved ? 'bg-green-100 dark:bg-green-900/30' : ''
                            )}>
                                <TableCell>
                                    <div className='flex items-start gap-2'>
                                     {(row.isFlagged || row.isResolved) && (
                                        <button onClick={() => handleFlagButtonClick(row)} data-tour-id={index === 0 ? "report-flag-button" : undefined}>
                                            {row.isFlagged && <Flag className="h-4 w-4 mt-2 text-orange-500 cursor-pointer" />}
                                            {row.isResolved && <CheckCircle className="h-4 w-4 mt-2 text-green-500 cursor-pointer" />}
                                        </button>
                                     )}
                                    <Textarea 
                                        placeholder="e.g., Access Control" 
                                        value={row.control} 
                                        onChange={(e) => handleControlChange(row.id, e.target.value)}
                                        className="min-h-[100px]" 
                                    />
                                    </div>
                                </TableCell>
                                <TableCell>
                                     <Textarea 
                                        placeholder="e.g., System access is restricted..." 
                                        value={row.observation} 
                                        onChange={(e) => handleObservationChange(row.id, e.target.value)}
                                        className="min-h-[100px]" 
                                    />
                                </TableCell>
                                <TableCell>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                          <div
                                            role="combobox"
                                            className={cn(
                                              buttonVariants({ variant: 'outline', size: 'default' }),
                                              'w-full justify-between h-auto cursor-pointer flex-wrap'
                                            )}
                                            data-tour-id={index === 0 ? "report-evidence-selector" : undefined}
                                          >
                                            <div className="flex gap-1 flex-wrap">
                                                {row.evidence.length > 0 ? row.evidence.map(evidenceId => {
                                                    const evidence = projectEvidence.find(e => e.id === evidenceId);
                                                    return (
                                                    <Badge
                                                        variant="secondary"
                                                        key={evidenceId}
                                                        className="mr-1"
                                                    >
                                                        {evidence?.name}
                                                        <div
                                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEvidenceChange(row.id, evidenceId);
                                                            }}
                                                        >
                                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                        </div>
                                                    </Badge>
                                                    );
                                                }) : <span>Select evidence...</span>}
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                          </div>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search evidence..." />
                                            <CommandList>
                                                <CommandEmpty>No evidence found.</CommandEmpty>
                                                <CommandGroup>
                                                    {projectEvidence.map(evidence => (
                                                    <CommandItem
                                                        key={evidence.id}
                                                        value={evidence.name}
                                                        onSelect={() => {
                                                            handleEvidenceChange(row.id, evidence.id);
                                                        }}
                                                    >
                                                        <CheckCircle
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                row.evidence.includes(evidence.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {evidence.name}
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                        </PopoverContent>
                                    </Popover>
                                </TableCell>
                                <TableCell>
                                     {row.isGenerating ? (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Analyzing...</span>
                                        </div>
                                    ) : (
                                        <Textarea readOnly value={row.analysis} placeholder="AI analysis will appear here." className="min-h-[100px] bg-muted/50" />
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className='flex flex-col gap-2 items-end'>
                                        <Button size="sm" onClick={() => handleGenerate(row.id)} disabled={row.isGenerating} data-tour-id={index === 0 ? "report-generate-button" : undefined}>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                        <div className="flex items-center">
                                             <button onClick={() => handleFlagButtonClick(row)} data-tour-id={index === 0 ? "report-flag-button" : undefined} className="p-2">
                                                <Flag className={cn("h-4 w-4", row.isFlagged ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} />
                                                 <span className="sr-only">{row.isResolved ? "Re-flag" : "Flag"}</span>
                                            </button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(row.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
        <div className="flex justify-start mt-4">
            <Button variant="outline" onClick={addRow}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Row
            </Button>
        </div>
      </CardContent>
    </Card>
    <ReportChatPanel 
        isOpen={isChatOpen} 
        onOpenChange={setIsChatOpen} 
        reportRows={reportRows}
        onApplySuggestion={updateReportRow}
        onReferenceClick={setHighlightedRow}
    />
     {/* Dialog for flagging and resolving */}
      <Dialog
        open={dialogState.isOpen}
        onOpenChange={(isOpen) => setDialogState((prev) => ({ ...prev, isOpen }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.isFlagging
                ? 'Flag Item for Review'
                : 'Review Flagged Item'}
            </DialogTitle>
            <DialogDescription>
              {dialogState.isFlagging
                ? 'Please provide a comment explaining why this item is being flagged.'
                : 'Review the comment below and resolve the flag.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {dialogState.isFlagging ? (
              <Textarea
                id="flag-comment"
                placeholder="Type your comment here..."
                value={dialogState.comment}
                onChange={(e) =>
                  setDialogState((prev) => ({ ...prev, comment: e.target.value }))
                }
                className="min-h-[100px]"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                <p>
                  <strong>Comment:</strong>
                </p>
                <p>{dialogState.comment || 'No comment provided.'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            {dialogState.isFlagging ? (
              <Button onClick={submitFlagDialog}>
                <Flag className="mr-2 h-4 w-4" /> Flag Item
              </Button>
            ) : (
              <Button onClick={() => resolveFlag(dialogState.rowId)}>
                <CheckCircle className="mr-2 h-4 w-4" /> Resolve Flag
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
    
