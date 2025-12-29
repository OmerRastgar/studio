"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/kratos-auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    FolderOpen,
    RefreshCw,
    ArrowLeft,
    Search,
    Calendar,
    ChevronRight,
    FileCheck,
    User,
    Plus
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
    id: string;
    name: string;
    framework: string;
    status: string;
    dueDate: string | null;
    progress: number;
    controlsComplete: number;
    controlsTotal: number;
    auditor?: {
        name: string;
        avatarUrl: string | null;
    };
}

export default function CustomerProjectsPage() {
    return (
        <RouteGuard requiredRoles={['customer']}>
            <CustomerProjectsContent />
        </RouteGuard>
    );
}

function CustomerProjectsContent() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchProjects = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch projects");

            const data = await res.json();
            if (data.success && data.data?.projects) {
                setProjects(data.data.projects);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [token]);

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.framework?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500">Approved</Badge>;
            case 'completed':
                return <Badge className="bg-blue-500">Completed</Badge>;
            case 'review_pending':
                return <Badge className="bg-orange-500">Under Review</Badge>;
            case 'in_progress':
                return <Badge className="bg-yellow-500">In Progress</Badge>;
            case 'rejected':
                return <Badge variant="destructive">Rejected</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="-ml-2">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    </Link>
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">My Projects</h1>
                    <p className="text-muted-foreground">View and manage your compliance projects</p>
                </div>
                <Link href="/dashboard?newProject=true" className="w-full md:w-auto">
                    <Button size="sm" className="w-full md:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                </Link>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
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
                    <Card key={project.id} className="hover:shadow-lg transition-all duration-200 active:scale-[0.98] h-full flex flex-col">
                        <Link href={`/dashboard/project/${project.id}`} className="flex-1 cursor-pointer">
                            <CardHeader className="pb-3">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                                            <CardTitle className="text-lg hover:underline truncate">{project.name}</CardTitle>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            {getStatusBadge(project.status)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="truncate max-w-full">{project.framework}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pb-2">
                                {/* Auditor */}
                                {project.auditor && (
                                    <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={project.auditor.avatarUrl || undefined} />
                                            <AvatarFallback>{project.auditor.name?.charAt(0) || 'A'}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-sm">
                                            <p className="font-medium">{project.auditor.name}</p>
                                            <p className="text-xs text-muted-foreground">Assigned Auditor</p>
                                        </div>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{project.controlsComplete}/{project.controlsTotal} Controls</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="truncate">{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-medium">{project.progress || 0}%</span>
                                    </div>
                                    <Progress value={project.progress || 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Link>
                        <div className="p-6 pt-0 mt-auto">
                            <Link href={`/dashboard/project/${project.id}`}>
                                <Button variant="outline" className="w-full">
                                    View Project
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ))}
            </div>

            {filteredProjects.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects found</p>
                </div>
            )}
        </div>
    );
}
