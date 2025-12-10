'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/auth-provider';
import { RouteGuard } from '@/components/route-guard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, Sparkles, Trash2, Loader2, Flag, FileDown, MessageSquare, CheckCircle, Briefcase, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReportChatPanel } from '@/components/report-chat-panel';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { reviewReport } from '@/ai/flows/review-report';
import { CircularSlider } from '@/components/ui/circular-slider';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EvidencePicker } from '@/components/reports/evidence-picker';

export interface EvidenceItem {
  id: string;
  fileName: string;
  fileUrl: string;
  tags: string[];
}

export type ReportRow = {
  id: string; // ProjectControl ID
  control: string;
  observation: string;
  evidence: EvidenceItem[];
  analysis: string;
  isGenerating: boolean;
  isFlagged: boolean;
  isResolved: boolean;
  flagComment?: string;
  progress: number;
  tags?: string[];
  reviewerNotes?: string;
  // helpers
  controlId: string;
};

interface Project {
  id: string;
  name: string;
  customerName?: string;
  customerAvatar?: string;
}

export default function ReportsPage() {
  return (
    <RouteGuard requiredRoles={['admin', 'auditor', 'reviewer', 'manager']}>
      <ReportsContent />
    </RouteGuard>
  );
}

function ReportsContent() {
  const { token } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [currentProjectDetails, setCurrentProjectDetails] = useState<any>(null);
  const [projectEvidence, setProjectEvidence] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const { toast } = useToast();
  const [isQaRunning, setIsQaRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false); // Added isReviewer state

  // State for the flag/comment dialog
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    rowId: string | null;
    isFlagging: boolean;
    comment: string;
  }>({ isOpen: false, rowId: null, isFlagging: true, comment: '' });

  // State for detailed control view (replacing inline editing for a single control)
  const [selectedControl, setSelectedControl] = useState<ReportRow | null>(null);
  const [observation, setObservation] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState(''); // Added reviewerNotes state
  const [isFlagged, setIsFlagged] = useState(false); // Added isFlagged state for detailed view
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false); // For AI analysis generation in detailed view

  // Use relative path for API calls to leverage Next.js rewrites/proxy
  const apiBase = '';

  // Fetch projects on load
  useEffect(() => {
    async function fetchProjects() {
      if (!token) return;
      try {
        const response = await fetch(`${apiBase}/api/auditor/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setProjects(data.data || []);
            if (data.data.length > 0) {
              setSelectedProject(data.data[0].id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch projects."
        });
      }
    }
    fetchProjects();
  }, [token, toast, apiBase]);

  // Fetch assessment data when project selected
  useEffect(() => {
    async function fetchAssessment() {
      if (!selectedProject || !token) return;

      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/assessment`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          // Map backend data to ReportRow
          const rows: ReportRow[] = data.data.controls.map((pc: any) => ({
            id: pc.id,
            controlId: pc.controlId || pc.id,
            control: `${pc.code}: ${pc.title}`,
            observation: pc.observation || '',
            evidence: pc.evidence || [],
            analysis: pc.aiAnalysis || '',
            isGenerating: false,
            isFlagged: pc.isFlagged || false,
            // Derive resolved state: Not flagged but has reviewer notes
            isResolved: (!pc.isFlagged && pc.reviewerNotes && pc.reviewerNotes.length > 0) || false,
            flagComment: pc.flagComment || '',
            progress: pc.progress || 0,
            tags: pc.tags || [],
            reviewerNotes: pc.reviewerNotes || '',
          }));

          setReportRows(rows);
          setIsViewOnly(data.data.isViewOnly);
          setIsReviewer(data.data.isReviewer || false); // Fetch isReviewer
          setCurrentProjectDetails(data.data.project);
          setProjectEvidence(data.data.projectEvidence || []);
        }
      } catch (error) {
        console.error("Failed to fetch assessment:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load assessment data."
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAssessment();
  }, [selectedProject, token, toast, apiBase]);

  const saveObservation = async (rowId: string, observation: string) => {
    if (isViewOnly || isReviewer) return; // Disable for reviewers and view-only

    try {
      await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/observation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ observation })
      });
      // No toast needed for auto-save, maybe a subtle indicator
    } catch (error) {
      console.error("Failed to save observation:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save your observation."
      });
    }
  };

  const handleSaveObservation = async () => {
    if (!selectedProject || !selectedControl || isViewOnly || isReviewer) return;

    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${selectedControl.id}/observation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ observation })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Status: ${res.status} - ${errText}`);
      }

      setReportRows(rows => rows.map(row => (row.id === selectedControl.id ? { ...row, observation: observation } : row)));
      setSelectedControl(prev => prev ? { ...prev, observation: observation } : null);
      toast({ title: "Observation Saved", description: "Your observation has been updated." });
    } catch (error) {
      console.error("Failed to save observation:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const saveProgress = async (rowId: string, progress: number) => {
    if (isViewOnly || isReviewer) return; // Disable for reviewers and view-only
    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ progress })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Status: ${res.status} - ${errText}`);
      }

      toast({
        title: "Saved",
        description: `Progress updated to ${progress}%`
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  const handleObservationChange = (rowId: string, newObservation: string) => {
    setReportRows(rows => rows.map(row => (row.id === rowId ? { ...row, observation: newObservation } : row)));
  };

  const handleGenerate = async (rowId: string) => {
    if (isViewOnly || isReviewer) return; // Disable for reviewers and view-only

    setReportRows(rows => rows.map(row => row.id === rowId ? { ...row, isGenerating: true, analysis: '' } : row));

    // Simulate AI generation or call AI service
    // Here we use a mock delay then save to backend
    setTimeout(async () => {
      const generatedAnalysis = 'AI Analysis: Evidence supports compliance. Recommendation: Maintain current controls.';

      try {
        await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/analysis`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ analysis: generatedAnalysis })
        });

        setReportRows(rows => rows.map(row => {
          if (row.id === rowId) {
            return {
              ...row,
              isGenerating: false,
              analysis: generatedAnalysis
            };
          }
          return row;
        }));

        toast({
          title: "Analysis Complete",
          description: "AI has generated the analysis."
        });
      } catch (error) {
        setReportRows(rows => rows.map(row => row.id === rowId ? { ...row, isGenerating: false } : row));
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save AI analysis."
        });
      }
    }, 1500);
  };

  const handleGenerateAnalysis = async () => {
    if (!selectedProject || !selectedControl || isViewOnly || isReviewer) return;

    setIsGeneratingMsg(true);
    setAiAnalysis('');

    setTimeout(async () => {
      const generatedAnalysis = 'AI Analysis: Evidence supports compliance. Recommendation: Maintain current controls.';

      try {
        await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${selectedControl.id}/analysis`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ analysis: generatedAnalysis })
        });

        setAiAnalysis(generatedAnalysis);
        setReportRows(rows => rows.map(row => (row.id === selectedControl.id ? { ...row, analysis: generatedAnalysis } : row)));
        setSelectedControl(prev => prev ? { ...prev, analysis: generatedAnalysis } : null);

        toast({
          title: "Analysis Complete",
          description: "AI has generated the analysis."
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save AI analysis."
        });
      } finally {
        setIsGeneratingMsg(false);
      }
    }, 1500);
  };

  const handleFlagButtonClick = (row: ReportRow) => {
    if (row.isFlagged) {
      setDialogState({
        isOpen: true,
        rowId: row.id,
        isFlagging: false,
        comment: row.flagComment || '',
      });
    } else {
      setDialogState({
        isOpen: true,
        rowId: row.id,
        isFlagging: true,
        comment: '',
      });
    }
  };

  const submitFlagDialog = async () => {
    const { rowId, isFlagging, comment } = dialogState;
    if (!rowId) return;

    if (isFlagging) {
      if (comment.trim() === '') {
        toast({
          variant: 'destructive',
          title: 'Comment required',
          description: 'Please provide a reason for flagging this row.',
        });
        return;
      }

      // Save to backend if Reviewer
      try {
        await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/review`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ reviewerNotes: comment, isFlagged: true })
        });

        setReportRows(rows =>
          rows.map(row =>
            row.id === rowId
              ? { ...row, isFlagged: true, isResolved: false, flagComment: comment, reviewerNotes: comment } // Update both fields
              : row
          )
        );
        toast({ title: 'Row Flagged', description: 'The item has been flagged for review.' });
      } catch (error) {
        console.error('Failed to save flag:', error);
        toast({ title: 'Error', description: 'Failed to save flag.', variant: 'destructive' });
      }
    }
    setDialogState({ isOpen: false, rowId: null, isFlagging: true, comment: '' });
  };

  const resolveFlag = async (rowId: string | null) => {
    if (!rowId) return;

    // Save resolution to backend (clear flag)
    try {
      await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isFlagged: false }) // Keep existing notes or clear? logic implies resolving flag
      });

      setReportRows(rows =>
        rows.map(row =>
          row.id === rowId ? { ...row, isFlagged: false, isResolved: true } : row
        )
      );
      toast({ title: 'Flag Resolved', description: 'The item has been marked as resolved.' });
    } catch (error) {
      console.error('Failed to resolve:', error);
      toast({ title: 'Error', description: 'Failed to resolve flag.', variant: 'destructive' });
    }

    setDialogState({ isOpen: false, rowId: null, isFlagging: true, comment: '' });
  };

  const handleAiQa = async () => {
    setIsQaRunning(true);
    toast({
      title: "AI QA in Progress",
      description: "The AI is reviewing the report for quality and consistency.",
    });

    try {
      const qaReportRows: any[] = reportRows.map(row => ({
        id: row.id,
        control: row.control,
        observation: row.observation,
        evidence: row.evidence.map(e => ({ name: e.fileName, type: 'document', tags: e.tags })),
      }));

      const result = await reviewReport({ reportRows: qaReportRows });

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

  const updateReportRow = (rowId: string, field: keyof ReportRow, value: any) => {
    setReportRows(prev =>
      prev.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
    // If observation updated via chat, save it
    if (field === 'observation') {
      saveObservation(rowId, value);
    }
  };

  const handleSelectControl = (control: ReportRow) => {
    setSelectedControl(control);
    setObservation(control.observation || '');
    setAiAnalysis(control.analysis || '');
    setReviewerNotes(control.reviewerNotes || '');
    setIsFlagged(control.isFlagged || false);
  };

  const handleSaveReview = async () => {
    if (!selectedProject || !selectedControl) return;

    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${selectedControl.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reviewerNotes, isFlagged })
      });
      const data = await res.json();

      if (res.ok) {
        // Update local state
        setReportRows(rows => rows.map(c =>
          c.id === selectedControl.id
            ? { ...c, reviewerNotes: data.data.reviewerNotes, isFlagged: data.data.isFlagged }
            : c
        ));
        setSelectedControl(prev => prev ? { ...prev, reviewerNotes: data.data.reviewerNotes, isFlagged: data.data.isFlagged } : null);
        toast({ title: "Review Saved", description: "Reviewer feedback validated." });
      } else {
        throw new Error(data.message || "Failed to save review.");
      }
    } catch (error) {
      console.error("Failed to save review:", error);
      toast({ title: "Error", description: `Failed to save review: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    }
  };


  /* Evidence Picker State */
  const [pickerState, setPickerState] = useState<{ isOpen: boolean; rowId: string | null }>({ isOpen: false, rowId: null });

  const handleLinkEvidence = async (evidenceIds: string[]) => {
    if (!pickerState.rowId || isViewOnly || isReviewer) return; // Disable for reviewers and view-only

    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${pickerState.rowId}/evidence/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ evidenceIds })
      });

      if (!res.ok) throw new Error("Failed to link evidence");

      const data = await res.json();

      // Optimistic update
      setReportRows(rows => rows.map(row => {
        if (row.id === pickerState.rowId) {
          const newEvidence = data.data.map((item: any) => ({
            id: item.id,
            fileName: item.fileName,
            fileUrl: item.fileUrl,
            tags: item.tags
          }));
          return {
            ...row,
            evidence: [...row.evidence, ...newEvidence]
          };
        }
        return row;
      }));

      toast({ title: "Evidence Linked", description: `Added ${evidenceIds.length} file(s).` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to link evidence." });
    }
  };

  return (
    <>
      <EvidencePicker
        isOpen={pickerState.isOpen}
        onOpenChange={(open) => setPickerState(prev => ({ ...prev, isOpen: open }))}
        evidence={projectEvidence}
        onSelect={handleLinkEvidence}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="font-headline">AI-Assisted Report Generation</CardTitle>
              <CardDescription>Select a project and build your audit report.</CardDescription>
              {currentProjectDetails && (
                <div className="flex items-center gap-2 mt-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{currentProjectDetails.customer?.name}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} {project.customerName ? `- ${project.customerName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Stats Cards */}
              {/* Removed create project dialog for simplicity */}

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
              <Button onClick={handleAiQa} disabled={isQaRunning}>
                {isQaRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                AI QA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentProjectDetails && (
            <div className="bg-muted/30 p-4 rounded-lg border mb-6 flex flex-col md:flex-row gap-6 justify-between items-start">
              <div className="flex items-start gap-4">
                {currentProjectDetails.customer?.avatarUrl ? (
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={currentProjectDetails.customer.avatarUrl} />
                    <AvatarFallback>{currentProjectDetails.customer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {currentProjectDetails.customer?.name?.charAt(0) || 'C'}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {currentProjectDetails.customer?.name || 'Unknown Customer'}
                    <Badge variant="outline" className="font-normal text-xs">Client</Badge>
                  </h2>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground/70">Website:</span>
                      <a href="#" className="text-blue-500 hover:underline">www.{currentProjectDetails.customer?.name?.toLowerCase().replace(/\s+/g, '') || 'website'}.com</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground/70">Contact:</span>
                      <span>{currentProjectDetails.customer?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-background/50 p-3 rounded border text-sm max-w-md w-full">
                <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Project Scope</div>
                <p className="text-muted-foreground leading-snug">
                  {currentProjectDetails.scope || currentProjectDetails.description || "No scope defined for this project."}
                </p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Control</TableHead>
                    <TableHead className="w-[25%]">Auditor Observation</TableHead>
                    <TableHead className="w-[15%]">Evidence</TableHead>
                    <TableHead className="w-[30%]">AI Analysis</TableHead>
                    <TableHead className="w-[10%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Bot className="h-12 w-12" />
                          <p className="mt-4 font-medium">No controls to display.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportRows.map((row) => (
                      <TableRow key={row.id} className={cn("align-top transition-colors duration-500",
                        highlightedRow === row.id ? 'bg-primary/20' : '',
                        row.isFlagged ? 'bg-orange-100 dark:bg-orange-900/30' : '',
                        row.isResolved ? 'bg-green-100 dark:bg-green-900/30' : ''
                      )}>
                        <TableCell>
                          <div className='flex items-start gap-2'>
                            {(row.isFlagged || row.isResolved) && (
                              <button onClick={() => handleFlagButtonClick(row)}>
                                {row.isFlagged && <Flag className="h-4 w-4 mt-2 text-orange-500 cursor-pointer" />}
                                {row.isResolved && <CheckCircle className="h-4 w-4 mt-2 text-green-500 cursor-pointer" />}
                              </button>
                            )}
                            <Textarea
                              value={row.control}
                              readOnly
                              className="min-h-[100px] bg-muted/20"
                            />
                          </div>

                        </TableCell>
                        <TableCell>
                          <Textarea
                            placeholder="Enter your observations..."
                            value={row.observation}
                            onChange={(e) => handleObservationChange(row.id, e.target.value)}
                            onBlur={(e) => saveObservation(row.id, e.target.value)}
                            readOnly={isViewOnly || isReviewer} // Disabled for reviewers
                            className="min-h-[100px]"
                          />
                          {row.reviewerNotes && row.isFlagged && (
                            <div className="mt-2 p-2 text-xs bg-yellow-50 border border-yellow-200 rounded">
                              <p className="font-medium text-yellow-900">Reviewer Note:</p>
                              <p className="text-yellow-800">{row.reviewerNotes}</p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap items-center">
                            {row.evidence.length > 0 ? row.evidence.map((evidence) => (
                              <Badge key={evidence.id} variant="secondary">
                                {evidence.fileName}
                              </Badge>
                            )) : <span className="text-muted-foreground text-sm italic mr-2">No evidence</span>}

                            {!isViewOnly && !isReviewer && ( // Disabled for reviewers
                              <button
                                onClick={() => setPickerState({ isOpen: true, rowId: row.id })}
                                className="h-6 w-6 rounded-full border border-dashed border-primary/50 flex items-center justify-center hover:bg-primary/10 transition-colors"
                                title="Add Evidence"
                              >
                                <PlusCircle className="h-4 w-4 text-primary" />
                              </button>
                            )}
                          </div>
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
                            {!isViewOnly && !isReviewer && ( // Disabled for reviewers
                              <Button size="sm" onClick={() => handleGenerate(row.id)} disabled={row.isGenerating}>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate
                              </Button>
                            )}
                            <div className="flex items-center gap-2">
                              <CircularSlider
                                value={row.progress}
                                size={32}
                                strokeWidth={4}
                                readOnly={isViewOnly || isReviewer} // Disabled for reviewers
                                onChange={(val) => setReportRows(rows => rows.map(r => r.id === row.id ? { ...r, progress: val } : r))}
                                onCommit={(val) => saveProgress(row.id, val)}
                                progressColor={row.progress === 100 ? "text-green-500" : "text-blue-500"}
                              />
                              <button onClick={() => handleFlagButtonClick(row)} className="p-2">
                                <Flag className={cn("h-4 w-4", row.isFlagged ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} />
                              </button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card >

      <ReportChatPanel
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        reportRows={reportRows}
        onApplySuggestion={updateReportRow}
        onReferenceClick={setHighlightedRow}
      />

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
                placeholder="Type your comment here..."
                value={dialogState.comment}
                onChange={(e) =>
                  setDialogState((prev) => ({ ...prev, comment: e.target.value }))
                }
                className="min-h-[100px]"
              />
            ) : (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
                <p><strong>Comment:</strong></p>
                <p>{dialogState.comment || 'No comment provided.'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
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
