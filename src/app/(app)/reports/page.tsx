'use client';

import { useState, useEffect } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileQuestion, MessageSquare, PlusCircle, Sparkles, Trash2, Loader2, Flag, FileDown, MessageCircle, CheckCircle, X, ChevronsUpDown, ShieldCheck } from 'lucide-react';
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

export type ReportRow = {
  id: string;
  control: string;
  observation: string;
  evidence: string[];
  analysis: string;
  isGenerating: boolean;
  isFlagged: boolean;
  isResolved: boolean;
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

  const toggleFlag = (rowId: string) => {
    setReportRows(rows => rows.map(row => (row.id === rowId ? { ...row, isFlagged: !row.isFlagged, isResolved: false } : row)));
  };

  const resolveFlag = (rowId: string) => {
    setReportRows(rows => rows.map(row => (row.id === rowId ? { ...row, isFlagged: false, isResolved: true } : row)));
  };

  const handleAiQa = () => {
    toast({
        title: "AI QA in Progress",
        description: "The AI is reviewing the report for quality and consistency.",
    });
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline">AI-Assisted Report Generation</CardTitle>
            <CardDescription>Select a project and build your audit report.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
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
                            Fill in the details below to create a new project.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="project-name" className="text-right">Name</Label>
                            <Input id="project-name" placeholder="e.g. Q3 Security Audit" className="col-span-3" />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="project-desc" className="text-right">Description</Label>
                            <Textarea id="project-desc" placeholder="A brief description of the project." className="col-span-3" />
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

            <Button variant="outline" onClick={() => setIsChatOpen(true)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
            </Button>
            <Button variant="secondary" onClick={loadSampleData}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Load Sample
            </Button>
             <Button onClick={handleAiQa}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                AI QA
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-x-auto">
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
                        reportRows.map(row => (
                            <TableRow key={row.id} className={cn("align-top transition-colors duration-500", 
                                highlightedRow === row.id ? 'bg-primary/20' : '',
                                row.isFlagged ? 'bg-orange-100 dark:bg-orange-900/30' : '',
                                row.isResolved ? 'bg-green-100 dark:bg-green-900/30' : ''
                            )}>
                                <TableCell>
                                    <div className='flex items-start gap-2'>
                                     {row.isFlagged && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button>
                                                    <Flag className="h-4 w-4 mt-2 text-orange-500 cursor-pointer" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">Flagged for Review</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            "Observation unclear. Please provide more specific details about the systems reviewed." - <span className='italic'>Jane Doe</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => resolveFlag(row.id)}>
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Resolve
                                                        </Button>
                                                         <Button size="sm" variant="ghost">
                                                            <MessageCircle className="mr-2 h-4 w-4" />
                                                            Comment
                                                        </Button>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                    {row.isResolved && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button>
                                                    <CheckCircle className="h-4 w-4 mt-2 text-green-500 cursor-pointer" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">Resolved</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            This item was marked as resolved by Admin.
                                                        </p>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
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
                                        <Button size="sm" onClick={() => handleGenerate(row.id)} disabled={row.isGenerating}>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                        <div className="flex items-center">
                                            <Button variant="ghost" size="icon" onClick={() => toggleFlag(row.id)}>
                                                <Flag className={cn("h-4 w-4", (row.isFlagged || row.isResolved) ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} />
                                                 <span className="sr-only">{row.isResolved ? "Re-flag" : "Flag"}</span>
                                            </Button>
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
    </>
  );
}
    