"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    FolderOpen,
    RefreshCw,
    ArrowLeft,
    Search,
    User,
    Calendar,
    ChevronRight,
    FileCheck
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Project {
    id: string;
    name: string;
    customerName: string;
    customerAvatar: string | null;
    frameworkName: string;
    status: string;
    dueDate: string | null;
    metrics: {
        progress: number;
        completedControls: number;
        totalControls: number;
        totalEvidence: number;
    };
    role: 'auditor' | 'reviewer';
}

export default function AuditorProjectsPage() {
    return (
        <RouteGuard requiredRoles={['admin', 'auditor', 'reviewer']}>
            <AuditorProjectsContent />
        </RouteGuard>
    );
}

function AuditorProjectsContent() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchProjects = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? 'http://localhost:8000' : '';
            const res = await fetch(`${apiBase}/api/auditor/projects`, {
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

    useEffect(() => {
        fetchProjects();
    }, [token]);

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.frameworkName.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <Link href="/dashboard/auditor">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Assigned Projects</h1>
                    <p className="text-muted-foreground">Manage your audit projects and reviews</p>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects, customers..."
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
                    <Link key={project.id} href={`/reports?project=${project.id}`}>
                        <Card className="hover:shadow-lg transition-shadow h-full cursor-pointer relative overflow-hidden">
                            <div className={`absolute top-0 right-0 p-1 px-3 text-xs font-bold text-white rounded-bl-lg ${project.role === 'reviewer' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                {project.role === 'reviewer' ? 'Reviewer' : 'Auditor'}
                            </div>
                            <CardHeader className="pb-3 pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-5 h-5 text-primary" />
                                        <CardTitle className="text-lg">{project.name}</CardTitle>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge variant="outline">{project.frameworkName}</Badge>
                                        <Badge variant={
                                            project.status === 'approved' ? 'default' :
                                                project.status === 'completed' ? 'secondary' :
                                                    project.status === 'rejected' ? 'destructive' : 'outline'
                                        } className="capitalize text-xs">
                                            {project.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Customer */}
                                <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={project.customerAvatar || undefined} />
                                        <AvatarFallback>{project.customerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="text-sm">
                                        <p className="font-medium">{project.customerName}</p>
                                        <p className="text-xs text-muted-foreground">Customer</p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-4 h-4 text-muted-foreground" />
                                        <span>{project.metrics.totalEvidence} Evidence</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No due date'}</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Audit Progress</span>
                                        <span className="font-medium">{project.metrics.progress}%</span>
                                    </div>
                                    <Progress value={project.metrics.progress} className="h-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {project.metrics.completedControls} of {project.metrics.totalControls} controls audited
                                    </p>
                                </div>

                                {/* View Details Button */}
                                <Button variant="outline" className="w-full mt-2">
                                    Open Audit
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    </Link>
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
