'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from '@/app/auth-provider';
import { RouteGuard } from '@/components/route-guard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, Sparkles, Trash2, Loader2, Flag, FileDown, MessageSquare, CheckCircle, Briefcase, PlusCircle, X } from 'lucide-react';
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

import { useActivityTracker } from '@/hooks/use-activity-tracker';
import { reviewReport } from '@/ai/flows/review-report';
import { CircularSlider } from '@/components/ui/circular-slider';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EvidencePicker } from '@/components/reports/evidence-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Lock } from 'lucide-react';

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
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false); // Added isReviewer state
  const searchParams = useSearchParams();
  const router = useRouter();


  const { toast } = useToast();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [currentProjectDetails, setCurrentProjectDetails] = useState<any | null>(null);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any | null>(null);

  const { trackActivity, sessionSeconds } = useActivityTracker({
    projectId: selectedProject,
    isDisabled: user?.role === 'manager',
    defaultActivityType: isReviewer ? 'review' : undefined
  });

  // UI States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQaRunning, setIsQaRunning] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);

  // Data States
  const [projectEvidence, setProjectEvidence] = useState<EvidenceItem[]>([]);
  const [observation, setObservation] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isFlagged, setIsFlagged] = useState(false);

  // Dialog State
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    variant: 'default' | 'destructive';
    rowId?: string;
    isFlagging?: boolean;
    comment?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    onAction: () => { },
    variant: 'default'
  });




  // Derived
  const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  };

  useEffect(() => {
    const fetchProjects = async () => {
      console.log('Fetching projects... Token:', !!token);
      if (!token) return;
      try {
        const res = await fetch(`${apiBase}/api/auditor/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        console.log('Projects response:', data);

        if (data.success && Array.isArray(data.data)) {
          setProjects(data.data);
          console.log('Projects set:', data.data.length);
        } else if (Array.isArray(data.data)) {
          setProjects(data.data); // Fallback if success not present but data is
        } else {
          console.error('Invalid projects data format:', data);
        }

      } catch (error) {
        console.error("Failed to fetch projects:", error);
      }
    };

    fetchProjects();

    // Set roles based on user
    // Manager role logic removed to prevent auto-reviewer assignment
  }, [token, apiBase]);

  // Effect to handle URL query param for project selection
  useEffect(() => {
    const projectIdParam = searchParams.get('projectId');
    if (projectIdParam && projects.length > 0 && !selectedProject) {
      // Verify project exists in list before selecting
      if (projects.some(p => p.id === projectIdParam)) {
        setSelectedProject(projectIdParam);
      }
    }
  }, [searchParams, projects, selectedProject]);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!selectedProject || !token) return;
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/assessment`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        // Map backend response structure to frontend state
        const projectData = data.data.project;
        const details = {
          ...projectData,
          totalDuration: projectData.totalDuration || 0
        };


        setCurrentProjectDetails(details);
        setProjectEvidence(data.data.projectEvidence || []);

        // Prioritize backend reviewer status if available
        if (typeof data.data.isReviewer !== 'undefined') {
          setIsReviewer(data.data.isReviewer);
        }

        setReportRows(data.data.controls.map((c: any) => ({
          id: c.id,
          controlId: c.controlId,
          control: c.code && c.title ? `${c.code}: ${c.title}` : "Unknown Control",
          observation: c.observation || '',
          evidence: c.evidence || [],
          analysis: c.analysis || '',
          isGenerating: false,
          isFlagged: c.isFlagged || false,
          isResolved: c.isResolved || false,
          flagComment: c.reviewerNotes || '', // Mapping reviewerNotes to flagComment for UI
          reviewerNotes: c.reviewerNotes || '',
          progress: c.progress || 0,
          tags: c.tags || []
        })));

      } catch (error) {
        console.error("Failed to fetch project details:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load project details."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [selectedProject, token, apiBase, toast]);

  const handleTrackActivity = useCallback((type: string) => {
    // Cast type to any to satisfy ActivityType if needed, or validate
    trackActivity(type as any);
  }, [trackActivity]);

  const saveObservation = async (rowId: string, observation: string) => {
    trackActivity('writing');

    // Allow edit if not view-only AND not a reviewer
    if (isViewOnly || isReviewer) return;

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
    trackActivity('writing');
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
    if (isViewOnly || isReviewer) return;
    trackActivity('writing');
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
      // trackActivity('chat'); // AI generation is technically "waiting" but user initiated it.
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

  const submitFlagDialog = async () => {
    const { rowId, isFlagging, comment: rawComment } = dialogState;
    const comment = rawComment || '';

    if (!rowId) return;
    trackActivity('review');

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
    setDialogState(prev => ({
      ...prev,
      isOpen: false,
      rowId: undefined,
      isFlagging: true,
      comment: ''
    }));
  };

  const handleFlagButtonClick = (row: ReportRow) => {
    if (row.isFlagged) {
      setDialogState({
        isOpen: true,
        title: 'Review Flag',
        description: 'Edit or resolve this flag.',
        actionLabel: 'Update',
        onAction: submitFlagDialog,
        variant: 'default',
        rowId: row.id,
        isFlagging: false,
        comment: row.flagComment || '',
      });
    } else {
      setDialogState({
        isOpen: true,
        title: 'Flag Control',
        description: 'Flag this control for review.',
        actionLabel: 'Flag',
        onAction: submitFlagDialog,
        variant: 'destructive',
        rowId: row.id,
        isFlagging: true,
        comment: '',
      });
    }
  };

  const resolveFlag = async (rowId: string | null) => {
    if (!rowId) return;
    trackActivity('review');

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
    trackActivity('review');
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
    trackActivity('attaching');
    if (!pickerState.rowId || !selectedProject || isViewOnly || isReviewer) return; // Disable for reviewers and view-only

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
    } finally {
      setPickerState({ isOpen: false, rowId: null });
    }
  };

  const handleUnlinkEvidence = async (rowId: string, evidenceId: string) => {
    trackActivity('review');
    if (!selectedProject || isViewOnly || isReviewer) return;

    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/controls/${rowId}/evidence/${evidenceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to unlink evidence");

      // Optimistic update
      setReportRows(rows => rows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            evidence: row.evidence.filter(e => e.id !== evidenceId)
          };
        }
        return row;
      }));

      toast({ title: "Evidence Removed", description: "The evidence link has been removed." });
    } catch (error) {
      console.error("Failed to unlink evidence:", error);
      toast({ title: "Error", description: "Failed to remove evidence link.", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedProject) return;

    // Validation for "Send Back"
    if (newStatus === 'returned') {
      const hasFlags = reportRows.some(row => row.isFlagged || (row.reviewerNotes && row.reviewerNotes.length > 0));
      if (!hasFlags) {
        toast({
          variant: "destructive",
          title: "Cannot Return Report",
          description: "You must flag at least one item or add reviewer notes before sending back for improvements."
        });
        return;
      }
    }

    try {
      const res = await fetch(`${apiBase}/api/auditor/projects/${selectedProject}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (res.ok) {
        // Update local state
        setCurrentProjectDetails((prev: any) => ({ ...prev, status: newStatus }));
        setProjects(prev => prev.map(p => p.id === selectedProject ? { ...p, status: newStatus } : p)); // Update list if needed

        let message = "Project status updated.";
        if (newStatus === 'review_pending') message = "Report submitted for review.";
        if (newStatus === 'approved') message = "Report approved and ready for export.";
        if (newStatus === 'returned') message = "Report returned to auditor for improvements.";

        toast({ title: "Status Updated", description: message });
      } else {
        throw new Error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast({ variant: "destructive", title: "Action Failed", description: error instanceof Error ? error.message : "Could not update status." });
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
              <select
                className="w-full sm:w-[200px] h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="" disabled>Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.customerName ? `- ${project.customerName}` : ''}
                  </option>
                ))}
              </select>

              {/* Stats Cards */}
              {/* Removed create project dialog for simplicity */}

              <div className="flex items-center gap-2">
                {/* Status Badge */}
                {currentProjectDetails?.status && (
                  <Badge variant={
                    currentProjectDetails.status === 'approved' ? 'default' :
                      currentProjectDetails.status === 'returned' ? 'destructive' : 'secondary'
                  } className="mr-2 capitalize">
                    {currentProjectDetails.status.replace('_', ' ')}
                  </Badge>
                )}

                {/* Auditor: Finish Report Button */}
                {!isReviewer && (currentProjectDetails?.status === 'in_progress' || currentProjectDetails?.status === 'returned') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="default">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Finish Report
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Submit for Review?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to send this report for review. You cannot export it until it is approved by a reviewer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUpdateStatus('review_pending')}>
                          Submit
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Reviewer Actions */}
                {isReviewer && currentProjectDetails?.status === 'review_pending' && (
                  <>
                    <Button variant="destructive" onClick={() => handleUpdateStatus('returned')}>
                      <Flag className="mr-2 h-4 w-4" />
                      Send Back
                    </Button>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus('approved')}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve Report
                    </Button>
                  </>
                )}

                {/* Export Button - Locked if not approved */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-block"> {/* Wrapper needed for disabled button tooltip */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" disabled={currentProjectDetails?.status !== 'approved'}>
                              {currentProjectDetails?.status !== 'approved' ? <Lock className="mr-2 h-4 w-4" /> : <FileDown className="mr-2 h-4 w-4" />}
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                            <DropdownMenuItem>Export as DOCX</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TooltipTrigger>
                    {currentProjectDetails?.status !== 'approved' && (
                      <TooltipContent>
                        <p>You must finish the report and get approval from a reviewer before exporting.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>

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
                <p className="text-muted-foreground leading-snug mb-3">
                  {currentProjectDetails.scope || currentProjectDetails.description || "No scope defined for this project."}
                </p>
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground/70">Time Logged:</span>
                  <span className="font-bold text-red-500">
                    {formatDuration(((currentProjectDetails as any).totalDuration || 0) + sessionSeconds)}
                  </span>
                </div>
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
                            readOnly={isViewOnly || (isReviewer && !(user?.id && currentProjectDetails?.auditor?.id === user.id))} // Disabled for reviewers unless they are the auditor
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
                              <Badge key={evidence.id} variant="secondary" className="flex items-center gap-1 pr-1">
                                {evidence.fileName}
                                {!isViewOnly && (!isReviewer || (user?.id && currentProjectDetails?.auditor?.id === user.id)) && (
                                  <span
                                    className="cursor-pointer hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnlinkEvidence(row.id, evidence.id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </span>
                                )}
                              </Badge>
                            )) : <span className="text-muted-foreground text-sm italic mr-2">No evidence</span>}

                            {!isViewOnly && (!isReviewer || (user?.id && currentProjectDetails?.auditor?.id === user.id)) && ( // Disabled for reviewers unless auditor
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
                            {!isViewOnly && (!isReviewer || (user?.id && currentProjectDetails?.auditor?.id === user.id)) && ( // Disabled for reviewers unless auditor
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
                                readOnly={isViewOnly || (isReviewer && !(user?.id && currentProjectDetails?.auditor?.id === user.id))} // Disabled for reviewers unless auditor
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

      <EvidencePicker
        isOpen={pickerState.isOpen}
        onOpenChange={(isOpen) => setPickerState(prev => ({ ...prev, isOpen }))}
        evidence={projectEvidence}
        onSelect={handleLinkEvidence}
      />

      <ReportChatPanel
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        reportRows={reportRows}
        onApplySuggestion={updateReportRow}
        onReferenceClick={setHighlightedRow}
        standardName={currentProjectDetails?.framework?.name || 'Standard'}
        onTrackActivity={handleTrackActivity}
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
