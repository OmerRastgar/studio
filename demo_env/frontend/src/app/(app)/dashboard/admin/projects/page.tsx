"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/kratos-auth-provider";
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
    ChevronRight
} from "lucide-react";
import Link from "next/link";

interface Project {
    id: string;
    name: string;
    framework: string | null;
    customer: { id: string; name: string; email: string } | null;
    auditor: { id: string; name: string; email: string } | null;
    dueDate: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    progress: number;
    controlsComplete: number;
    controlsTotal: number;
    createdAt: string;
}

export default function AdminProjectsPage() {
    const { user, token } = useAuth(); // Get token from auth provider
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchProjects = async () => {
        if (!token) return; // Don't fetch without token
        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/projects`, {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch projects: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            if (data.success) setProjects(data.data);
        } catch (err) {
            console.error('[AdminProjectsPage] Error fetching projects:', err);
            setError(err instanceof Error ? err.message : "Failed to load projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchProjects();
        }
    }, [token]);

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.framework?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.auditor?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Group projects by customer
    const projectsByCustomer = filteredProjects.reduce((acc, project) => {
        const customerName = project.customer?.name || "Unassigned Customer";
        if (!acc[customerName]) {
            acc[customerName] = [];
        }
        acc[customerName].push(project);
        return acc;
    }, {} as Record<string, Project[]>);

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
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">All Projects</h1>
                    <p className="text-muted-foreground">View and manage all projects grouped by customer</p>
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

            {/* Projects Grouped by Customer */}
            <div className="space-y-8">
                {Object.entries(projectsByCustomer).map(([customerName, customerProjects]) => (
                    <div key={customerName} className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <User className="w-5 h-5 text-primary" />
                            <h2 className="text-xl font-semibold">{customerName}</h2>
                            <Badge variant="secondary">{customerProjects.length} Projects</Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {customerProjects.map((project) => (
                                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <FolderOpen className="w-5 h-5 text-primary" />
                                                <CardTitle className="text-lg">{project.name}</CardTitle>
                                            </div>
                                            {project.framework && (
                                                <Badge variant="outline">{project.framework}</Badge>
                                            )}
                                        </div>
                                        <CardDescription className="line-clamp-2">
                                            {project.description || "No description provided"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
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

                                        {/* View Details Button */}
                                        <Link href={`/dashboard/project/${project.id}`}>
                                            <Button variant="outline" className="w-full mt-2">
                                                View Details
                                                <ChevronRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
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
