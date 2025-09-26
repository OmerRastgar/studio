
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { mockEvidence, mockProjects, mockAgents } from '@/lib/data';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Trash2, Edit, Eye, FolderArchive, X, UploadCloud, Tag } from 'lucide-react';
import { useState, useMemo, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Evidence } from '@/lib/types';

function EvidencePageComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const agentId = searchParams.get('agentId');
    const { toast } = useToast();

    const [evidenceList, setEvidenceList] = useState(mockEvidence);
    const [selectedProject, setSelectedProject] = useState(mockProjects[0].id);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // State for upload dialog
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [newEvidenceName, setNewEvidenceName] = useState('');
    const [currentTag, setCurrentTag] = useState('');
    const [newEvidenceTags, setNewEvidenceTags] = useState<string[]>([]);

    // State for edit dialog
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
    const [editName, setEditName] = useState('');
    const [editTags, setEditTags] = useState<string[]>([]);
    const [currentEditTag, setCurrentEditTag] = useState('');


    const filteredEvidence = useMemo(() => {
        return evidenceList
            .filter(e => agentId ? e.agentId === agentId : e.projectId === selectedProject);
    }, [evidenceList, selectedProject, agentId]);
    
    const selectedProjectName = useMemo(() => {
        return mockProjects.find(p => p.id === selectedProject)?.name;
    }, [selectedProject]);

    const agentName = useMemo(() => {
        if (!agentId) return null;
        return mockAgents.find(a => a.id === agentId)?.name;
    }, [agentId]);

    const handleDelete = (id: string) => {
        setEvidenceList(evidenceList.filter(e => e.id !== id));
        setItemToDelete(null);
        toast({ title: "Evidence Deleted", description: "The evidence item has been removed." });
    };

    const handleDeleteAll = () => {
        setEvidenceList(evidenceList.filter(e => e.projectId !== selectedProject));
        toast({ title: "All Evidence Deleted", description: `All evidence for project ${selectedProjectName} has been removed.` });
    };

    const clearAgentFilter = () => {
        router.push('/evidence');
    };
    
    // --- Upload Handlers ---
    const handleAddTag = () => {
        if (currentTag && !newEvidenceTags.includes(currentTag)) {
            setNewEvidenceTags([...newEvidenceTags, currentTag]);
            setCurrentTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setNewEvidenceTags(newEvidenceTags.filter(tag => tag !== tagToRemove));
    };

    const handleUpload = () => {
        if (!newEvidenceName) {
            toast({
                variant: 'destructive',
                title: 'Missing Name',
                description: 'Please provide a name for the evidence.',
            });
            return;
        }

        const newEvidence: Evidence = {
            id: `EV${String(evidenceList.length + 1).padStart(3, '0')}`,
            projectId: selectedProject,
            name: newEvidenceName,
            type: 'document' as const,
            tags: newEvidenceTags,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Admin Auditor',
            previewUrl: 'https://picsum.photos/seed/new-evidence/64/64',
            aiHint: 'document',
        };

        setEvidenceList([newEvidence, ...evidenceList]);
        
        toast({
            title: 'Evidence Uploaded',
            description: `"${newEvidenceName}" has been added to the locker.`,
        });

        // Reset form and close dialog
        setNewEvidenceName('');
        setNewEvidenceTags([]);
        setCurrentTag('');
        setIsUploadDialogOpen(false);
    };

    // --- Edit Handlers ---
    const handleEditClick = (evidence: Evidence) => {
        setEditingEvidence(evidence);
        setEditName(evidence.name);
        setEditTags(evidence.tags);
        setIsEditDialogOpen(true);
    };
    
    const handleAddEditTag = () => {
        if (currentEditTag && !editTags.includes(currentEditTag)) {
            setEditTags([...editTags, currentEditTag]);
            setCurrentEditTag('');
        }
    };

    const handleRemoveEditTag = (tagToRemove: string) => {
        setEditTags(editTags.filter(tag => tag !== tagToRemove));
    };

    const handleUpdate = () => {
        if (!editingEvidence) return;

        setEvidenceList(prevList => prevList.map(e => 
            e.id === editingEvidence.id 
                ? { ...e, name: editName, tags: editTags } 
                : e
        ));

        toast({
            title: 'Evidence Updated',
            description: `"${editName}" has been successfully updated.`,
        });

        // Reset and close
        setIsEditDialogOpen(false);
        setEditingEvidence(null);
        setEditName('');
        setEditTags([]);
        setCurrentEditTag('');
    };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-headline">Evidence Locker</CardTitle>
          <CardDescription>Upload, tag, and manage evidence files for your projects.</CardDescription>
          {agentName && (
              <div className="flex items-center gap-2 mt-2">
                 <Badge variant="secondary">Filtering by Agent: {agentName}</Badge>
                 <Button variant="ghost" size="sm" onClick={clearAgentFilter}>
                     <X className="mr-2 h-4 w-4" />
                     Clear Filter
                 </Button>
              </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
           <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!!agentId}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map(project => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                    <Button className='w-full sm:w-auto'>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Upload Evidence
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload New Evidence</DialogTitle>
                        <DialogDescription>
                            Name and tag your evidence file for easy retrieval.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className='flex items-center justify-center w-full'>
                            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/50">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG, LOG, etc.</p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="evidence-name">Evidence Name</Label>
                            <Input
                                id="evidence-name"
                                placeholder="e.g., Q3 Firewall Config Export"
                                value={newEvidenceName}
                                onChange={(e) => setNewEvidenceName(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="evidence-tags">Tags</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="evidence-tags"
                                    placeholder="e.g., networking, q3-review"
                                    value={currentTag}
                                    onChange={(e) => setCurrentTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                />
                                <Button variant="outline" onClick={handleAddTag}>
                                    <Tag className="mr-2 h-4 w-4" /> Add
                                </Button>
                            </div>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {newEvidenceTags.map((tag) => (
                                <Badge key={tag} variant="secondary">
                                    {tag}
                                    <button
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </button>
                                </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload}>Upload Evidence</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <AlertDialog>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="hidden md:table-cell">Uploaded At</TableHead>
                <TableHead>
                    <span className="sr-only">Actions</span>
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredEvidence.map((evidence) => (
                <TableRow key={evidence.id}>
                    <TableCell className="hidden sm:table-cell">
                    <Image
                        alt={evidence.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={evidence.previewUrl}
                        width="64"
                        data-ai-hint={evidence.aiHint}
                    />
                    </TableCell>
                    <TableCell className="font-medium">{evidence.name}</TableCell>
                    <TableCell>
                    <div className="flex flex-wrap gap-1">
                        {evidence.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                            {tag}
                        </Badge>
                        ))}
                    </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={evidence.uploadedBy.startsWith('AGENT') ? 'default' : 'outline'}>
                            {evidence.uploadedBy}
                        </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                    {format(new Date(evidence.uploadedAt), 'PPP')}
                    </TableCell>
                    <TableCell>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(evidence)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onClick={() => setItemToDelete(evidence.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
             <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this piece of evidence.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => itemToDelete && handleDelete(itemToDelete)}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         {filteredEvidence.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <FolderArchive className="mx-auto h-12 w-12" />
                <h3 className="mt-2 text-sm font-medium">No evidence found.</h3>
                <p className="mt-1 text-sm">{agentId ? 'This agent has not uploaded any evidence.' : 'Get started by uploading some evidence.'}</p>
            </div>
        )}
        {filteredEvidence.length > 0 && !agentId && (
          <div className='flex justify-end pt-6'>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete All Evidence for {selectedProjectName}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Delete all evidence for {selectedProjectName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all evidence for this project.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll}>
                        Yes, delete all
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Edit Evidence Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Evidence</DialogTitle>
                <DialogDescription>
                    Update the name and tags for this piece of evidence.
                </DialogDescription>
            </DialogHeader>
            {editingEvidence && (
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-evidence-name">Evidence Name</Label>
                        <Input
                            id="edit-evidence-name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-evidence-tags">Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                id="edit-evidence-tags"
                                placeholder="Add a new tag"
                                value={currentEditTag}
                                onChange={(e) => setCurrentEditTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEditTag()}
                            />
                            <Button variant="outline" onClick={handleAddEditTag}>
                                <Tag className="mr-2 h-4 w-4" /> Add
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {editTags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                                {tag}
                                <button
                                    onClick={() => handleRemoveEditTag(tag)}
                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                            </Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function EvidencePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EvidencePageComponent />
        </Suspense>
    );
}
