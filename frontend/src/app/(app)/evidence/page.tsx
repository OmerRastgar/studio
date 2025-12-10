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
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle, Trash2, Edit, FolderArchive, X, UploadCloud, Tag, Loader2 } from 'lucide-react';
import { useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { EvidenceUploadDialog } from '@/components/ui/evidence-upload-dialog';

import { useAuth } from '@/app/auth-provider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

// ... interfaces ...
interface Project {
    id: string;
    name: string;
    customerName: string;
}

interface Evidence {
    id: string;
    projectId: string;
    agentId: string | null;
    fileName: string;
    fileUrl: string | null;
    type: string;
    tags: string[];
    uploadedAt: string;
    uploadedBy: { id: string; name: string };
    agent?: { id: string; name: string } | null;
    controls: {
        id: string;
        control: { code: string; title: string };
    }[];
}

interface ProjectControl {
    id: string;
    control: { code: string; title: string };
}

function EvidencePageComponent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const agentId = searchParams.get('agentId');
    const { toast } = useToast();

    // Compliance Restriction Check
    if (user?.role === 'compliance') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Evidence Locker</CardTitle>
                    <CardDescription>Evidence management is restricted for your role.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FolderArchive className="h-12 w-12 mb-4" />
                    <p>Compliance users cannot view or upload detailed evidence files.</p>
                    <p className="mt-2 text-sm">Please refer to the Project Details page for evidence counts.</p>
                </CardContent>
            </Card>
        );
    }

    // Data state
    const [projects, setProjects] = useState<Project[]>([]);
    const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
    const [controls, setControls] = useState<ProjectControl[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // State for upload dialog
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

    // State for edit dialog
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
    const [editName, setEditName] = useState('');
    const [editControls, setEditControls] = useState<string[]>([]);
    const [editTags, setEditTags] = useState<string[]>([]);
    const [currentEditTag, setCurrentEditTag] = useState('');
    const [updating, setUpdating] = useState(false);

    // Fetch projects based on user role
    const fetchProjects = useCallback(async () => {
        const token = getToken();
        if (!token) {
            console.log('No auth token found');
            setError('Please log in to view projects');
            return;
        }

        try {
            // Try endpoints in order based on common roles
            // Note: API_URL may be '/api' in Docker, so don't include /api prefix in endpoints
            const endpoints = [
                '/auditor/projects',
                '/customer/projects',
                '/manager/projects',
                '/admin/projects'
            ];

            let response: Response | null = null;
            let lastError = '';
            const allResults: string[] = [];

            for (const endpoint of endpoints) {
                console.log(`Trying ${endpoint}...`);
                try {
                    response = await fetch(`${API_URL}${endpoint}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    const status = response.status;
                    allResults.push(`${endpoint}: ${status}`);
                    console.log(`${endpoint}: ${status}`);

                    if (response.ok) {
                        console.log(`Success with ${endpoint}`);
                        break;
                    } else if (status === 403) {
                        console.log(`403 on ${endpoint}, trying next...`);
                        lastError = `All endpoints returned 403 (unauthorized)`;
                        continue;
                    } else {
                        lastError = `${endpoint}: ${status}`;
                    }
                } catch (fetchErr) {
                    allResults.push(`${endpoint}: network error`);
                    console.error(`Network error on ${endpoint}:`, fetchErr);
                }
            }

            if (!response || !response.ok) {
                console.error('All endpoint results:', allResults);
                throw new Error(lastError || `No accessible endpoint. Results: ${allResults.join(', ')}`);
            }

            const result = await response.json();
            // Handle both plain array and wrapped {success, data} format
            const data = Array.isArray(result) ? result : (result.data || []);
            console.log('Projects fetched:', data.length);
            setProjects(data);
            if (data.length > 0 && !selectedProject) {
                setSelectedProject(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects. Check console for details.');
        }
    }, [selectedProject]);

    // Fetch evidence for selected project
    const fetchEvidence = useCallback(async () => {
        if (!selectedProject) {
            setEvidenceList([]);
            return;
        }

        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(
                `${API_URL}/evidence?projectId=${selectedProject}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to fetch evidence');

            const data = await response.json();
            setEvidenceList(data);
        } catch (err) {
            console.error('Error fetching evidence:', err);
            setError('Failed to load evidence');
        }
    }, [selectedProject]);

    // Fetch controls for selected project
    const fetchControls = useCallback(async () => {
        if (!selectedProject) {
            setControls([]);
            return;
        }

        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(
                `${API_URL}/auditor/projects/${selectedProject}/assessment`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok && response.status !== 403) {
                throw new Error('Failed to fetch controls');
            }

            if (response.ok) {
                const result = await response.json();
                // Backend returns {success: true, data: {controls: [...]}}
                const controlsList = result.data?.controls || result.controls || [];
                console.log('Fetched controls:', controlsList.length);
                setControls(controlsList.map((pc: any) => ({
                    id: pc.id,
                    control: { code: pc.code, title: pc.title }
                })));
            }
        } catch (err) {
            console.error('Error fetching controls:', err);
        }
    }, [selectedProject]);

    // Initial load
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchProjects();
            setLoading(false);
        };
        load();
    }, [fetchProjects]);

    // Load evidence and controls when project changes
    useEffect(() => {
        if (selectedProject) {
            fetchEvidence();
            fetchControls();
        }
    }, [selectedProject, fetchEvidence, fetchControls]);

    const filteredEvidence = useMemo(() => {
        if (agentId) {
            return evidenceList.filter(e => e.agentId === agentId);
        }
        return evidenceList;
    }, [evidenceList, agentId]);

    const selectedProjectName = useMemo(() => {
        return projects.find(p => p.id === selectedProject)?.name || 'Unknown Project';
    }, [projects, selectedProject]);

    const agentName = useMemo(() => {
        if (!agentId) return null;
        const evidence = evidenceList.find(e => e.agentId === agentId);
        return evidence?.agent?.name || agentId;
    }, [agentId, evidenceList]);

    const handleDelete = async (id: string) => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/evidence/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete evidence');

            setEvidenceList(evidenceList.filter(e => e.id !== id));
            setItemToDelete(null);
            toast({ title: "Evidence Deleted", description: "The evidence item has been removed." });
        } catch (err) {
            console.error('Error deleting evidence:', err);
            toast({ variant: 'destructive', title: "Error", description: "Failed to delete evidence." });
        }
    };

    const clearAgentFilter = () => {
        router.push('/evidence');
    };

    // --- Edit Handlers ---
    const handleEditClick = (evidence: Evidence) => {
        setEditingEvidence(evidence);
        setEditName(evidence.fileName);
        setEditControls(evidence.controls?.map(c => c.id) || []);
        setEditTags(evidence.tags || []);
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

    const toggleEditControl = (cId: string) => {
        setEditControls(prev =>
            prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
        );
    };

    const handleUpdate = async () => {
        if (!editingEvidence) return;

        const token = getToken();
        if (!token) return;

        setUpdating(true);
        try {
            const response = await fetch(`${API_URL}/evidence/${editingEvidence.id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: editName,
                    controlIds: editControls,
                    tags: editTags
                })
            });

            if (!response.ok) throw new Error('Failed to update evidence');

            const updated = await response.json();
            setEvidenceList(prevList => prevList.map(e => e.id === editingEvidence.id ? updated : e));

            toast({ title: 'Evidence Updated', description: `"${editName}" has been updated.` });

            // Reset and close
            setIsEditDialogOpen(false);
            setEditingEvidence(null);
            setEditName('');
            setEditControls([]);
            setEditTags([]);
            setCurrentEditTag('');
        } catch (err) {
            console.error('Error updating evidence:', err);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update evidence.' });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error && projects.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FolderArchive className="h-12 w-12 mb-4" />
                    <p>{error}</p>
                </CardContent>
            </Card>
        );
    }

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
                                {projects.map(project => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name} - {project.customerName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button className='w-full sm:w-auto' onClick={() => setIsUploadDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Upload Evidence
                        </Button>
                        <EvidenceUploadDialog
                            open={isUploadDialogOpen}
                            onOpenChange={setIsUploadDialogOpen}
                            projectId={selectedProject}
                            controls={controls}
                            onSuccess={() => {
                                setIsUploadDialogOpen(false);
                                fetchEvidence();
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <AlertDialog>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Control</TableHead>
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
                                        <TableCell className="font-medium">{evidence.fileName}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {evidence.controls && evidence.controls.length > 0 ? (
                                                    evidence.controls.map(c => (
                                                        <Badge key={c.id} variant="outline">
                                                            {c.control.code}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {evidence.tags?.map((tag) => (
                                                    <Badge key={tag} variant="secondary">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={evidence.agent ? 'default' : 'outline'}>
                                                {evidence.agent?.name || evidence.uploadedBy?.name || 'Unknown'}
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
                </CardContent>
            </Card>

            {/* Edit Evidence Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Evidence</DialogTitle>
                        <DialogDescription>
                            Update the name, control, and tags for this piece of evidence.
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
                                <Label>Link to Controls</Label>
                                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                                    {controls.map(c => (
                                        <div key={c.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`edit-control-${c.id}`}
                                                checked={editControls.includes(c.id)}
                                                onCheckedChange={() => toggleEditControl(c.id)}
                                            />
                                            <Label
                                                htmlFor={`edit-control-${c.id}`}
                                                className="text-sm font-normal cursor-pointer"
                                            >
                                                <span className="font-medium text-primary">{c.control.code}</span> - {c.control.title}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-evidence-tags">Tags</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="edit-evidence-tags"
                                        placeholder="Add a new tag"
                                        value={currentEditTag}
                                        onChange={(e) => setCurrentEditTag(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEditTag())}
                                    />
                                    <Button variant="outline" onClick={handleAddEditTag} type="button">
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
                        <Button onClick={handleUpdate} disabled={updating}>
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
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
