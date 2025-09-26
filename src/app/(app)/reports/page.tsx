'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, FileQuestion, PlusCircle, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { mockProjects, mockEvidence } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type ReportRow = {
  id: string;
  control: string;
  observation: string;
  evidence: string[];
  analysis: string;
  isGenerating: boolean;
};

const sampleReportData: Omit<ReportRow, 'id' | 'isGenerating'>[] = [
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
  const { toast } = useToast();

  const projectEvidence = mockEvidence.filter(e => e.projectId === selectedProject);

  const loadSampleData = () => {
    setReportRows(
      sampleReportData.map((row, index) => ({
        ...row,
        id: `sample-${index}-${Date.now()}`,
        isGenerating: false,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline">AI-Assisted Report Generation</CardTitle>
            <CardDescription>Select a project and build your audit report.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                    {mockProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="secondary" onClick={loadSampleData}>
              <FileQuestion className="mr-2 h-4 w-4" />
              Load Sample
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
                            <TableRow key={row.id} className="align-top">
                                <TableCell>
                                    <Textarea placeholder="e.g., Access Control" defaultValue={row.control} className="min-h-[100px]" />
                                </TableCell>
                                <TableCell>
                                    <Textarea placeholder="e.g., System access is restricted..." defaultValue={row.observation} className="min-h-[100px]" />
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                                                <span>{row.evidence.length > 0 ? `${row.evidence.length} selected` : "Select evidence"}</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56" align="start">
                                            {projectEvidence.map(evidence => (
                                                <DropdownMenuCheckboxItem
                                                    key={evidence.id}
                                                    checked={row.evidence.includes(evidence.id)}
                                                    onCheckedChange={() => handleEvidenceChange(row.id, evidence.id)}
                                                    onSelect={(e) => e.preventDefault()}
                                                >
                                                    {evidence.name}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                            {projectEvidence.length === 0 && <div className='p-2 text-sm text-muted-foreground'>No evidence for this project.</div>}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRow(row.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
  );
}
