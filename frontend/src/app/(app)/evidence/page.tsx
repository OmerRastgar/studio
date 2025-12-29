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
import { MoreHorizontal, PlusCircle, Trash2, Edit, FolderArchive, X, UploadCloud, Tag, Loader2, ExternalLink, MessageSquare } from 'lucide-react';
import { useState, useMemo, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { EvidenceUploadDialog } from '@/components/ui/evidence-upload-dialog';

import { useAuth } from '@/components/auth/kratos-auth-provider';
import { useActivityTracker } from '@/hooks/use-activity-tracker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

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
    annotationCount: number;
}



interface ProjectControl {
    id: string;
    control: {
        code: string;
        title: string;
        tags?: { name: string }[];
    };
}

function EvidencePageComponent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const agentId = searchParams.get('agentId');
    const { toast } = useToast();

    // Compliance Restriction Check
    const role = user?.role?.toLowerCase();

    if (role === 'compliance') {
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
    // State for actions
    const [updating, setUpdating] = useState(false);

    // Role checks
    // Role checks
    // Default to view-only if role is undefined or matches restricted roles
    const isViewOnly = !role || role === 'manager' || role === 'admin' || role === 'reviewer';



    // Time Tracking
    const { trackActivity } = useActivityTracker({ projectId: selectedProject || null });

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
                '/api/auditor/projects',
                '/api/customer/projects',
                '/api/manager/projects',
                '/api/admin/projects'
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

            // Auto-select based on Query Param or keep empty
            const projectIdParam = searchParams.get('projectId');
            if (projectIdParam && data.find((p: Project) => p.id === projectIdParam)) {
                setSelectedProject(projectIdParam);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
            setError('Failed to load projects. Check console for details.');
        }
    }, [selectedProject, searchParams]);

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
                `${API_URL}/api/evidence?projectId=${selectedProject}`,
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
            // Try customer endpoint first (works for customers and auditors)
            let response = await fetch(
                `${API_URL}/api/customer/projects/${selectedProject}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Fallback to auditor endpoint for backwards compatibility
            if (!response.ok && response.status === 403) {
                response = await fetch(
                    `${API_URL}/api/auditor/projects/${selectedProject}/assessment`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }

            if (!response.ok) {
                if (response.status !== 403) {
                    throw new Error('Failed to fetch controls');
                }
                return; // Silent fail on 403
            }

            const result = await response.json();

            // Handle both customer project response (has categories with controls)
            // and auditor assessment response (has flat controls list)
            let controlsList: any[] = [];

            if (result.data?.categories) {
                // Customer endpoint format: {data: {categories: [{controls: [...]}]}}
                controlsList = result.data.categories.flatMap((cat: any) => cat.controls || []);
            } else if (result.data?.controls) {
                // Auditor endpoint format: {data: {controls: [...]}}
                controlsList = result.data.controls;
            } else if (result.controls) {
                // Legacy format
                controlsList = result.controls;
            }

            console.log('Fetched controls:', controlsList.length);
            setControls(controlsList.map((pc: any) => ({
                id: pc.id,
                control: {
                    code: pc.code || pc.control?.code,
                    title: pc.title || pc.control?.title,
                    tags: pc.tags || []
                }
            })));
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
            const response = await fetch(`${API_URL}/api/evidence/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error('Delete failed debug info:', errData);
                throw new Error(errData.error || 'Failed to delete evidence');
            }

            setEvidenceList(evidenceList.filter(e => e.id !== id));
            setItemToDelete(null);
            toast({ title: "Evidence Deleted", description: "The evidence item has been removed." });
        } catch (err) {
            console.error('Error deleting evidence:', err);
            toast({ variant: 'destructive', title: "Error", description: err instanceof Error ? err.message : "Failed to delete evidence." });
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
        setEditControls(prev => {
            const isAdding = !prev.includes(cId);
            const targetControl = controls.find(c => c.id === cId);

            if (targetControl && targetControl.control.tags) {
                const controlTags = targetControl.control.tags || []; // Assuming tags are { name: string }[] or string[]
                // Need to verify the shape of 'controls' prop or fetch it.
                // The 'controls' prop in EvidenceUploadDialog (and here) comes from parent.
                // Check EvidencePageComponent controls usage.

                // We need to update editTags
                setEditTags(currentTags => {
                    if (isAdding) {
                        // Add tags that aren't already there
                        const newTags = [...currentTags];
                        controlTags.forEach((t: any) => { // 't' might be object or string depending on interface
                            const tName = typeof t === 'string' ? t : t.name;
                            if (!newTags.includes(tName)) newTags.push(tName);
                        });
                        return newTags;
                    } else {
                        // Remove tags that belong to this control (and ONLY this control?)
                        // That's risky. What if user manually added same tag?
                        // For now, let's remove them to solve the "Ghost" issue. User can re-add if needed.
                        const tagsToRemove = controlTags.map((t: any) => typeof t === 'string' ? t : t.name);
                        return currentTags.filter(t => !tagsToRemove.includes(t));
                    }
                });
            }

            return isAdding ? [...prev, cId] : prev.filter(id => id !== cId);
        });
    };

    const handleUpdate = async () => {
        if (!editingEvidence) return;

        const token = getToken();
        if (!token) return;

        setUpdating(true);
        try {
            const response = await fetch(`${API_URL}/api/evidence/${editingEvidence.id}`, {
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

    const getDownloadUrl = (url: string | null) => {
        if (!url) return '#';

        // If it's already a relative proxy URL, prepend API_URL (which is empty string usually, so relative to domain)
        if (url.startsWith('/api/uploads/download')) {
            return url;
        }

        // If it's a legacy MinIO URL (internal docker DNS), convert to proxy URL
        // Format: http://minio:9000/evidence/PROJECTID/FILEID.ext
        if (url.includes('minio:9000')) {
            try {
                // Extract project ID and filename from URL
                // url parts: http:, , minio:9000, evidence, projectId, filename
                const parts = url.split('/');
                const filenameIndex = parts.length - 1;
                const projectIdIndex = parts.length - 2;

                if (filenameIndex > 0 && projectIdIndex > 0) {
                    const filename = parts[filenameIndex];
                    const projectId = parts[projectIdIndex];
                    return `/api/uploads/download/${projectId}/${filename}`;
                }
            } catch (e) {
                console.error('Failed to parse legacy URL', e);
            }
        }

        return url;
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
                                {projects.map(project => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name} - {project.customerName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!isViewOnly ? (
                            <Button className='w-full sm:w-auto' onClick={() => setIsUploadDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Upload Evidence
                            </Button>
                        ) : (
                            <Button
                                className='w-full sm:w-auto opacity-50 cursor-not-allowed'
                                variant="outline"
                                onClick={() => toast({
                                    variant: "destructive",
                                    title: "Permission Denied",
                                    description: "You do not have permission to upload evidence."
                                })}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Upload Evidence
                            </Button>
                        )}
                        <EvidenceUploadDialog
                            open={isUploadDialogOpen}
                            onOpenChange={setIsUploadDialogOpen}
                            projectId={selectedProject}
                            controls={controls}
                            onSuccess={() => {
                                setIsUploadDialogOpen(false);
                                fetchEvidence();
                                trackActivity('attaching');
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>

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
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={`/evidence/${evidence.id}/view`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline text-primary flex items-center gap-2"
                                            >
                                                {evidence.fileName}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                            {evidence.annotationCount > 0 && (
                                                <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ml-2" title={`${evidence.annotationCount} comments`}>
                                                    <MessageSquare className="h-3 w-3 mr-1" />
                                                    {evidence.annotationCount}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
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
                                                <Button aria-haspopup="true" size="icon" variant="ghost" className={isViewOnly ? "opacity-50" : ""}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => !isViewOnly ? handleEditClick(evidence) : toast({
                                                        variant: "destructive",
                                                        title: "Permission Denied",
                                                        description: "You cannot edit this evidence."
                                                    })}
                                                    disabled={isViewOnly}
                                                >
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => !isViewOnly ? setItemToDelete(evidence.id) : toast({
                                                        variant: "destructive",
                                                        title: "Permission Denied",
                                                        description: "You cannot delete this evidence."
                                                    })}
                                                    disabled={isViewOnly}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Delete Confirmation Dialog - Moved outside Table for stability */}
                    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete this piece of evidence.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (itemToDelete) handleDelete(itemToDelete);
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {selectedProject && filteredEvidence.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <FolderArchive className="mx-auto h-12 w-12" />
                            <h3 className="mt-2 text-sm font-medium">No evidence found.</h3>
                            <p className="mt-1 text-sm">{agentId ? 'This agent has not uploaded any evidence.' : 'Get started by uploading some evidence.'}</p>
                        </div>
                    )}

                    {!selectedProject && (
                        <div className="text-center py-12 text-muted-foreground">
                            <FolderArchive className="mx-auto h-12 w-12 opacity-50" />
                            <h3 className="mt-4 text-lg font-medium">No Project Selected</h3>
                            <p className="mt-2 text-sm max-w-sm mx-auto">Please select a project from the dropdown menu above to view its evidence locker.</p>
                        </div>
                    )}
                </CardContent>
            </Card >

            {/* Edit Evidence Dialog */}
            < Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} >
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
            </Dialog >
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
