"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/kratos-auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    FolderOpen,
    RefreshCw,
    ArrowLeft,
    Search,
    User,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface Project {
    id: string;
    name: string;
    framework: string | null;
    customer: { id: string; name: string; email: string } | null;
    auditor: { id: string; name: string; email: string } | null;
    reviewer: { id: string; name: string; email: string } | null;
    dueDate: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    progress: number;
    controlsComplete: number;
    controlsTotal: number;
    createdAt: string;
    status: string;
}

export default function ManagerProjectsPage() {
    return (
        <RouteGuard requiredRoles={['admin', 'manager']}>
            <ManagerProjectsContent />
        </RouteGuard>
    );
}

function ManagerProjectsContent() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [auditors, setAuditors] = useState<any[]>([]);
    const [selectedAuditorId, setSelectedAuditorId] = useState<string>('');
    const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [approvalDueDate, setApprovalDueDate] = useState("");
    const [approving, setApproving] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        startDate: '',
        dueDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchProjects();
        fetchAuditors();
    }, [token]);

    const fetchAuditors = async () => {
        if (!token) return;
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/manager/auditors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAuditors(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch auditors:', error);
        }
    };

    const fetchProjects = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/manager/projects`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch projects");

            const data = await res.json();
            if (data.success) setProjects(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (project: Project) => {
        setSelectedProject(project);
        setSelectedAuditorId(project.auditor?.id || '');
        setSelectedReviewerId(project.reviewer?.id || '');
        setApprovalDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '');
        setIsApproveOpen(true);
    };

    const handleAssignClick = (project: Project) => {
        setSelectedProject(project);
        setSelectedAuditorId(project.auditor?.id || '');
        setSelectedReviewerId(project.reviewer?.id || '');
        setIsAssignOpen(true);
    };

    const handleEditClick = (project: Project) => {
        setSelectedProject(project);
        setEditForm({
            name: project.name,
            description: project.description || '',
            startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : '',
            endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : ''
        });
        setIsEditOpen(true);
    };

    const handleApproveSubmit = async () => {
        if (!selectedProject || !token || !selectedAuditorId || !selectedReviewerId || !approvalDueDate) {
            alert('Please select an auditor, a reviewer, and a due date');
            return;
        }

        if (selectedAuditorId === selectedReviewerId) {
            alert('Auditor and Reviewer cannot be the same person');
            return;
        }

        setApproving(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/manager/projects/${selectedProject.id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    auditorId: selectedAuditorId,
                    reviewerAuditorId: selectedReviewerId,
                    dueDate: approvalDueDate
                })
            });

            if (!res.ok) throw new Error("Failed to approve project");

            setIsApproveOpen(false);
            fetchProjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to approve project");
        } finally {
            setApproving(false);
        }
    };

    const handleAssignSubmit = async () => {
        if (!selectedProject || !token || !selectedAuditorId || !selectedReviewerId) {
            alert('Please select an auditor and a reviewer');
            return;
        }

        if (selectedAuditorId === selectedReviewerId) {
            alert('Auditor and Reviewer cannot be the same person');
            return;
        }

        setApproving(true); // Reusing 'approving' state for assignment
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/manager/projects/${selectedProject.id}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    auditorId: selectedAuditorId,
                    reviewerAuditorId: selectedReviewerId,
                })
            });

            if (!res.ok) throw new Error("Failed to assign project");

            setIsAssignOpen(false);
            fetchProjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to assign project");
        } finally {
            setApproving(false);
        }
    };

    const handleEditSubmit = async () => {
        if (!selectedProject || !token) return;

        setApproving(true); // Reusing 'approving' state for editing
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/manager/projects/${selectedProject.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(editForm)
            });

            if (!res.ok) throw new Error("Failed to update project");

            setIsEditOpen(false);
            fetchProjects();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update project");
        } finally {
            setApproving(false);
        }
    };

    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const filteredProjects = projects.filter(project =>
        project.status !== 'rejected' && // Hide rejected projects (Initial rejection)
        ((project.name && project.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (project.framework && project.framework.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (project.customer && project.customer.name && project.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (project.auditor && project.auditor.name && project.auditor.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (project.reviewer && project.reviewer.name && project.reviewer.name.toLowerCase().includes(searchQuery.toLowerCase())))
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved': return 'default'; // Blue/Primary
            case 'completed': return 'success'; // Green (if supported) or 'secondary'
            case 'in_progress': return 'secondary'; // Blue-ish
            case 'review_pending': return 'secondary'; // Purple-ish
            case 'returned': return 'destructive'; // Orange/Red (Attention needed)
            default: return 'outline';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-blue-600';
            case 'completed': return 'bg-green-600';
            case 'in_progress': return 'bg-blue-500';
            case 'review_pending': return 'bg-purple-500';
            case 'returned': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/manager">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">All Projects</h1>
                    <p className="text-muted-foreground">View and manage all projects</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects, customers, auditors..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="sm" onClick={fetchProjects}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Projects Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="w-5 h-5 text-primary" />
                                    <CardTitle className="text-lg">{project.name}</CardTitle>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {project.framework && (
                                        <Badge variant="outline">{project.framework}</Badge>
                                    )}
                                    <Badge className={`${getStatusColor(project.status)} text-white capitalize text-xs hover:${getStatusColor(project.status)}`}>
                                        {project.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {project.description || "No description provided"}
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Customer */}
                            {project.customer && (
                                <div className="flex items-center gap-2 text-sm">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Customer:</span>
                                    <span className="font-medium">{project.customer.name}</span>
                                </div>
                            )}

                            {/* Auditor */}
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-blue-500" />
                                <span className="text-muted-foreground">Auditor:</span>
                                {project.auditor ? (
                                    <span className="font-medium text-blue-600">{project.auditor.name}</span>
                                ) : (
                                    <Badge variant="secondary">Unassigned</Badge>
                                )}
                            </div>

                            {/* Reviewer */}
                            <div className="flex items-center gap-2 text-sm">
                                <User className="w-4 h-4 text-purple-500" />
                                <span className="text-muted-foreground">Reviewer:</span>
                                {project.reviewer ? (
                                    <span className="font-medium text-purple-600">{project.reviewer.name}</span>
                                ) : (
                                    <Badge variant="secondary">Unassigned</Badge>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                <div>
                                    <span className="block font-medium">Start:</span>
                                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"}
                                </div>
                                <div>
                                    <span className="block font-medium">End:</span>
                                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : "N/A"}
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Compliance</span>
                                    <span className="font-medium">{project.progress}%</span>
                                </div>
                                <Progress value={project.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                    {project.controlsComplete} of {project.controlsTotal} controls complete
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                                <Link href={`/dashboard/project/${project.id}`} className="flex-1">
                                    <Button variant="outline" className="w-full">
                                        View Controls
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                                <div className="flex gap-2">
                                    {project.status === 'pending' && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleApproveClick(project)}
                                        >
                                            Review & Approve
                                        </Button>
                                    )}
                                    {['approved', 'in_progress', 'review_pending', 'returned'].includes(project.status) && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAssignClick(project)}
                                        >
                                            Reassign
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditClick(project)}
                                    >
                                        Edit
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Approve Dialog */}
            <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve & Assign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Assign Auditor</label>
                            <Select onValueChange={setSelectedAuditorId} value={selectedAuditorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Auditor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.map((auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Assign Reviewer</label>
                            <Select onValueChange={setSelectedReviewerId} value={selectedReviewerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.filter(a => a.id !== selectedAuditorId).map((auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Due Date</label>
                            <Input
                                type="date"
                                value={approvalDueDate}
                                onChange={(e) => setApprovalDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveOpen(false)}>Cancel</Button>
                        <Button onClick={handleApproveSubmit} disabled={approving}>
                            {approving ? "Approving..." : "Approve & Assign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reassign Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Select New Auditor</label>
                            <Select onValueChange={setSelectedAuditorId} value={selectedAuditorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Auditor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.map((auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Select Reviewer</label>
                            <Select onValueChange={setSelectedReviewerId} value={selectedReviewerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.filter(a => a.id !== selectedAuditorId).map((auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssignSubmit} disabled={approving}>
                            {approving ? "Saving..." : "Reassign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Project Name</label>
                            <Input
                                name="name"
                                value={editForm.name}
                                onChange={handleEditFormChange}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Description</label>
                            <Textarea
                                name="description"
                                value={editForm.description}
                                onChange={handleEditFormChange}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Start Date</label>
                                <Input
                                    type="date"
                                    name="startDate"
                                    value={editForm.startDate}
                                    onChange={handleEditFormChange}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Due Date</label>
                                <Input
                                    type="date"
                                    name="dueDate"
                                    value={editForm.dueDate}
                                    onChange={handleEditFormChange}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">End Date</label>
                                <Input
                                    type="date"
                                    name="endDate"
                                    value={editForm.endDate}
                                    onChange={handleEditFormChange}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditSubmit} disabled={approving}>
                            {approving ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects found</p>
                </div>
            )}
        </div>
    );
}
