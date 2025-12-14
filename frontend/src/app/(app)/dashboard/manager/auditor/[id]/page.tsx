"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/app/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
    ArrowLeft,
    FolderCheck,
    Clock,
    CheckCircle,
    TrendingUp,
    RefreshCw,
    Mail,
    Calendar,
    Target,
    Eye,
    AlertCircle,
    Timer
} from "lucide-react";

interface AuditorProject {
    id: string;
    name: string;
    customer: string;
    framework: string;
    status: string;
    progress: number;
    controlsCount: number;
    dueDate: string | null;
    createdAt: string;
    auditHours: number;
    reviewHours: number;
    totalHours: number;
    mistakes: number;
}

interface AuditorStats {
    activeProjects: number;
    completedProjects: number;
    avgCompletion: number;
    totalAuditHours: number;
    totalReviewHours: number;
    totalMistakes: number;
    workload: string;
}

interface AuditorDetail {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
    lastActive: string | null;
    stats: AuditorStats;
    auditProjects: AuditorProject[];
    reviewerProjects: AuditorProject[];
}

export default function AuditorDetailPage() {
    const params = useParams();
    const { token } = useAuth();
    const [auditor, setAuditor] = useState<AuditorDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAuditor = async () => {
        if (!token || !params.id) return;
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiBase}/api/manager/auditors/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAuditor(data.data);
            } else {
                setError(data.error || 'Failed to fetch auditor');
            }
        } catch (err) {
            setError('Failed to fetch auditor details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditor();
    }, [token, params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !auditor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <p className="text-destructive">{error || 'Auditor not found'}</p>
                <Button onClick={fetchAuditor} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/manager">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={auditor.avatarUrl || undefined} />
                        <AvatarFallback className="text-xl">
                            {auditor.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold">{auditor.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{auditor.email}</span>
                        </div>
                    </div>
                    <Badge variant={
                        auditor.stats.workload === 'high' ? 'destructive' :
                            auditor.stats.workload === 'medium' ? 'secondary' : 'outline'
                    } className="ml-auto text-sm px-3 py-1">
                        {auditor.stats.workload.toUpperCase()} WORKLOAD
                    </Badge>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                        <Clock className="w-4 h-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{auditor.stats.activeProjects}</div>
                        <p className="text-xs text-muted-foreground">In progress</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{auditor.stats.completedProjects}</div>
                        <p className="text-xs text-muted-foreground">Finished audits</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                        <Timer className="w-4 h-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{auditor.stats.totalAuditHours.toFixed(1)}</div>
                        <p className="text-xs text-muted-foreground">Review: {auditor.stats.totalReviewHours.toFixed(1)}h</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Mistakes</CardTitle>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{auditor.stats.totalMistakes}</div>
                        <p className="text-xs text-muted-foreground">Flagged items</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{auditor.stats.avgCompletion}%</div>
                        <Progress value={auditor.stats.avgCompletion} className="mt-2" />
                    </CardContent>
                </Card>
            </div>

            {/* Audit Projects */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Projects ({auditor.auditProjects.length})</CardTitle>
                    <CardDescription>Projects where this user is the Primary Auditor</CardDescription>
                </CardHeader>
                <CardContent>
                    {auditor.auditProjects.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No audit projects assigned</p>
                    ) : (
                        <div className="space-y-3">
                            {auditor.auditProjects.map((project: AuditorProject) => (
                                <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <Link href={`/reports?projectId=${project.id}`} className="font-medium hover:text-primary hover:underline">
                                                {project.name}
                                            </Link>
                                            <Badge className={getStatusColor(project.status)}>
                                                {project.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span>{project.customer}</span>
                                            <span>•</span>
                                            <span>{project.framework}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-red-500" />
                                                {project.mistakes} mistakes
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{project.auditHours}h</div>
                                            <div className="text-xs text-muted-foreground">Audit Time</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{project.progress}%</div>
                                            <Progress value={project.progress} className="w-24 h-2" />
                                        </div>
                                        <Link href={`/reports?projectId=${project.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Target className="w-4 h-4 mr-1" />
                                                View Report
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Review Projects */}
            <Card>
                <CardHeader>
                    <CardTitle>Reviewer Projects ({auditor.reviewerProjects.length})</CardTitle>
                    <CardDescription>Projects where this user is the Reviewer</CardDescription>
                </CardHeader>
                <CardContent>
                    {auditor.reviewerProjects.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No reviewer projects assigned</p>
                    ) : (
                        <div className="space-y-3">
                            {auditor.reviewerProjects.map((project: AuditorProject) => (
                                <div key={project.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <Link href={`/reports?projectId=${project.id}`} className="font-medium hover:text-primary hover:underline">
                                                {project.name}
                                            </Link>
                                            <Badge className={getStatusColor(project.status)}>
                                                {project.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                            <span>{project.customer}</span>
                                            <span>•</span>
                                            <span>{project.framework}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3 text-red-500" />
                                                {project.mistakes} flagged
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{project.reviewHours}h</div>
                                            <div className="text-xs text-muted-foreground">Review Time</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{project.progress}%</div>
                                            <Progress value={project.progress} className="w-24 h-2" />
                                        </div>
                                        <Link href={`/reports?projectId=${project.id}`}>
                                            <Button variant="outline" size="sm">
                                                <Target className="w-4 h-4 mr-1" />
                                                View Report
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
