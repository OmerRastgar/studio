"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Users,
    FolderOpen,
    Shield,
    FileCheck,
    Clock,
    RefreshCw,
    UserPlus,
    Upload,
    AlertCircle
} from "lucide-react";

interface AdminMetrics {
    totals: {
        projects: number;
        users: number;
        frameworks: number;
        controls: number;
        evidence: number;
    };
    compliance: {
        overall: number;
        projectsWithControls: number;
    };
    usersByRole: Array<{ role: string; count: number }>;
    recentActivity: {
        evidenceUploads: number;
    };
}

interface WorkflowItem {
    type: string;
    title: string;
    description: string;
    entityId: string;
    entityType: string;
    assignee?: { id: string; name: string } | null;
    customer?: { id: string; name: string } | null;
    createdAt?: string;
}

export default function AdminDashboardPage() {
    return (
        <RouteGuard requiredRoles={['admin']}>
            <AdminDashboardContent />
        </RouteGuard>
    );
}

function AdminDashboardContent() {
    const { token, user } = useAuth();
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? 'http://localhost:8000' : '';

            // Fetch metrics and workflows in parallel
            const [metricsRes, workflowsRes] = await Promise.all([
                fetch(`${apiBase}/api/admin/metrics`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${apiBase}/api/admin/workflows/pending`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ]);

            if (!metricsRes.ok || !workflowsRes.ok) {
                throw new Error("Failed to fetch admin data");
            }

            const [metricsData, workflowsData] = await Promise.all([
                metricsRes.json(),
                workflowsRes.json()
            ]);

            if (metricsData.success) setMetrics(metricsData.data);
            if (workflowsData.success) setWorkflows(workflowsData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

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
                <Button onClick={fetchData} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        System overview and management
                    </p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Metrics Cards */}
            {metrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href="/dashboard/admin/projects">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Projects</CardTitle>
                                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.totals.projects}</div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.compliance.projectsWithControls} with controls
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/users">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.totals.users}</div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.usersByRole.length} roles
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/admin/frameworks">
                        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Frameworks</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.totals.frameworks}</div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.totals.controls} controls
                                </p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Evidence</CardTitle>
                            <FileCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{metrics.totals.evidence}</div>
                            <p className="text-xs text-muted-foreground">
                                +{metrics.recentActivity.evidenceUploads} this week
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Quick Actions and User Distribution */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Common admin tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <Link href="/users">
                            <Button variant="outline" className="w-full justify-start">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Manage Users
                            </Button>
                        </Link>
                        <Link href="/dashboard/admin/frameworks">
                            <Button variant="outline" className="w-full justify-start">
                                <Upload className="w-4 h-4 mr-2" />
                                Import Controls (CSV)
                            </Button>
                        </Link>
                        <Link href="/dashboard/admin/projects">
                            <Button variant="outline" className="w-full justify-start">
                                <FolderOpen className="w-4 h-4 mr-2" />
                                View All Projects
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* User Distribution */}
                {metrics && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Users by Role</CardTitle>
                            <CardDescription>Distribution of system users</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {metrics.usersByRole.map((item) => (
                                    <div key={item.role} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{item.role}</Badge>
                                        </div>
                                        <span className="text-lg font-semibold">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Pending Workflows */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Pending Actions
                    </CardTitle>
                    <CardDescription>Items requiring attention</CardDescription>
                </CardHeader>
                <CardContent>
                    {workflows.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No pending actions</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {workflows.slice(0, 5).map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant={item.type === 'project_incomplete' ? 'default' : 'secondary'}
                                        >
                                            {item.type === 'project_incomplete' ? 'Project' : 'Evidence'}
                                        </Badge>
                                        <div>
                                            <p className="font-medium text-sm">{item.title}</p>
                                            <p className="text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                    </div>
                                    <Link href={`/dashboard/project/${item.entityId}`}>
                                        <Button variant="ghost" size="sm">
                                            View
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
