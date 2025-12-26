"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/kratos-auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ControlCategory } from "@/components/ui/control-category";
import { ArrowLeft, Calendar, Shield, User, RefreshCw, FileText } from "lucide-react";

interface ProjectData {
    id: string;
    name: string;
    framework: {
        id: string;
        name: string;
        version: string;
    } | null;
    auditor: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    } | null;
    dueDate: string | null;
    categories: Array<{
        name: string;
        controls: Array<{
            id: string;
            controlId: string;
            code: string;
            title: string;
            description: string;
            tags: string[];
            progress: number;
            evidenceCount: number;
            evidence: any[];
            notes: string | null;
        }>;
        totalControls: number;
        completedControls: number;
        progress: number;
    }>;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token, user } = useAuth();
    const projectId = params.id as string;

    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProject = async () => {
        if (!token || !projectId || !user) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            let endpoint = '';

            switch (user.role) {
                case 'admin':
                    endpoint = `/api/admin/projects/${projectId}`;
                    break;
                case 'manager':
                    endpoint = `/api/manager/projects/${projectId}`;
                    break;
                case 'auditor':
                    endpoint = `/api/auditor/projects/${projectId}`;
                    break;
                case 'compliance':
                    endpoint = `/api/compliance/projects/${projectId}`;
                    break;
                case 'customer':
                    endpoint = `/api/customer/projects/${projectId}`;
                    break;
                default:
                    endpoint = `/api/customer/projects/${projectId}`;
            }

            const res = await fetch(`${apiBase}${endpoint}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch project");
            }

            const data = await res.json();
            if (data.success) {
                setProject(data.data);
            } else {
                throw new Error(data.error || "Unknown error");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load project");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [token, projectId, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-destructive">{error}</p>
                <Button onClick={fetchProject} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    if (!project) {
        return null;
    }

    // Calculate overall progress
    const totalControls = project.categories.reduce((sum, cat) => sum + cat.totalControls, 0);
    const completedControls = project.categories.reduce((sum, cat) => sum + cat.completedControls, 0);
    const overallProgress = totalControls > 0
        ? Math.round((completedControls / totalControls) * 100)
        : 0;

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "No due date";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const isRestricted = user?.role === 'admin' || user?.role === 'compliance';
    const isAuditor = user?.role === 'auditor';

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center justify-between mb-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                {isAuditor && (
                    <Button
                        variant="default"
                        onClick={() => router.push(`/reports?projectId=${projectId}`)}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        View Report
                    </Button>
                )}
            </div>

            {/* Project Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-2xl">{project.name}</CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-2">
                                {project.framework && (
                                    <span className="flex items-center gap-1">
                                        <Shield className="w-4 h-4" />
                                        {project.framework.name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(project.dueDate)}
                                </span>
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchProject}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Progress Section */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Overall Progress</span>
                                    <span className="font-medium">{overallProgress}%</span>
                                </div>
                                <Progress value={overallProgress} className="h-3" />
                            </div>
                            <div className="flex gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Controls: </span>
                                    <span className="font-medium">{completedControls} / {totalControls}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Categories: </span>
                                    <span className="font-medium">{project.categories.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Auditor Section */}
                        {project.auditor && (
                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={project.auditor.avatarUrl || undefined} alt={project.auditor.name} />
                                    <AvatarFallback>
                                        {project.auditor.name.split(" ").map((n) => n[0]).join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Auditor</span>
                                    </div>
                                    <p className="font-medium">{project.auditor.name}</p>
                                    <p className="text-sm text-muted-foreground">{project.auditor.email}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Control Categories */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Controls by Category</h2>
                {project.categories.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            No controls assigned to this project yet.
                        </CardContent>
                    </Card>
                ) : (
                    (() => {
                        // Flatten all controls from all categories for the upload dialog
                        const allControls = project.categories.flatMap(cat =>
                            cat.controls.map(c => ({
                                id: c.id,
                                control: {
                                    code: c.code,
                                    title: c.title
                                },
                                tags: c.tags
                            }))
                        );

                        return project.categories.map((category) => (
                            <ControlCategory
                                key={category.name}
                                name={category.name}
                                controls={category.controls}
                                allControls={allControls}
                                totalControls={category.totalControls}
                                completedControls={category.completedControls}
                                progress={category.progress}
                                projectId={projectId}
                                onEvidenceUploaded={fetchProject}
                                hideEvidence={isRestricted}
                                readOnly={isRestricted}
                            />
                        ));
                    })()
                )}
            </div>
        </div>
    );
}
