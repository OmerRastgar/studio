"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { ProjectCard } from "@/components/ui/project-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Folder, FileCheck, BarChart3, Mail, Calendar, Bell, RefreshCw, Plus, Clock, XCircle, Users, Share2, Shield, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatContextOptional } from "@/components/chat/ChatProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

import { ComplianceProjectionCard } from './compliance-projection-card';

interface DashboardData {
    stats: {
        totalProjects: number;
        totalEvidence: number;
        overallCompliance: number;
    };
    projects: Array<{
        id: string;
        name: string;
        framework: string;
        frameworkId: string | null;
        progress: number;
        controlsComplete: number;
        controlsTotal: number;
        evidenceCount: number;
        dueDate: string | null;
        status?: string;
        rejectionReason?: string | null;
        auditor: {
            id: string;
            name: string;
            email: string;
            avatarUrl: string | null;
        } | null;
    }>;
    assignedAuditors: Array<{
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    }>;
}

type Project = DashboardData['projects'][0];

interface ComplianceUser {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    sharedProjects: {
        project: {
            id: string;
            name: string;
        }
    }[];
}

export function CustomerDashboardView() {
    const { user, token } = useAuth();
    const router = useRouter();
    const chatContext = useChatContextOptional();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New Project Dialog states
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
    const [frameworks, setFrameworks] = useState<Array<{ id: string; name: string; description: string | null; _count: { controls: number } }>>([]);
    const [selectedFramework, setSelectedFramework] = useState<string>("");
    const [projectName, setProjectName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [description, setDescription] = useState("");
    const [scope, setScope] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // Issue Reporting State
    const [showIssueDialog, setShowIssueDialog] = useState(false);
    const [issueProject, setIssueProject] = useState("");
    const [issueTitle, setIssueTitle] = useState("");
    const [issueDescription, setIssueDescription] = useState("");
    const [issueLoading, setIssueLoading] = useState(false);
    const [issueSuccess, setIssueSuccess] = useState<string | null>(null);

    const handleReportIssue = async () => {
        if (!issueProject || !issueTitle || !issueDescription) return;
        setIssueLoading(true);
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/issues`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ projectId: issueProject, title: issueTitle, description: issueDescription })
            });
            if (res.ok) {
                setIssueSuccess("Issue reported successfully");
                setTimeout(() => {
                    setShowIssueDialog(false);
                    setIssueSuccess(null);
                    setIssueTitle("");
                    setIssueDescription("");
                    setIssueProject("");
                }, 1500);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIssueLoading(false);
        }
    };

    // Compliance User states
    const [complianceUsers, setComplianceUsers] = useState<ComplianceUser[]>([]);

    // Audit Requests state
    const [requests, setRequests] = useState<Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        dueDate: string | null;
        auditor: { name: string; email: string };
        project: { name: string } | null;
    }>>([]);

    const fetchRequests = async () => {
        if (!token) return;
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/requests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setRequests(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        }
    };

    useEffect(() => {
        fetchDashboard();
        fetchComplianceUsers();
        fetchRequests();
    }, [token]);

    const [showNewUserDialog, setShowNewUserDialog] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [userCreateLoading, setUserCreateLoading] = useState(false);

    const fetchDashboard = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch dashboard data");
            }

            const data = await res.json();
            if (data.success) {
                setDashboardData(data.data);
            } else {
                throw new Error(data.error || "Unknown error");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    const fetchComplianceUsers = async () => {
        if (!token) return;
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/compliance/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            setComplianceUsers(data);
        } catch (err) {
            console.error('Failed to fetch compliance users:', err);
        }
    };

    const fetchFrameworks = async () => {
        if (!token) return;
        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/frameworks`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setFrameworks(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch frameworks:', err);
        }
    };

    const handleCreateProject = async () => {
        if (!projectName.trim() || !selectedFramework || !startDate || !endDate || !dueDate || !scope) {
            setCreateError('Please fill in all required fields (Project Name, Framework, Dates, and Scope)');
            return;
        }

        setCreateLoading(true);
        setCreateError(null);
        setCreateSuccess(null);

        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/customer/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: projectName,
                    frameworkId: selectedFramework,
                    startDate,
                    endDate,
                    dueDate,
                    description,
                    scope
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create project');
            }

            setCreateSuccess(data.message || 'Project request submitted!');
            setProjectName('');
            setSelectedFramework('');
            setStartDate('');
            setEndDate('');
            setDueDate('');
            setDescription('');
            setScope('');
            fetchDashboard();

            setTimeout(() => {
                setShowNewProjectDialog(false);
                setCreateSuccess(null);
            }, 2000);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setCreateLoading(false);
        }
    };

    const [userCreateError, setUserCreateError] = useState<string | null>(null);

    const handleCreateComplianceUser = async () => {
        if (!newUserName || !newUserEmail || !newUserPassword) {
            setUserCreateError("All fields are required");
            return;
        }

        setUserCreateLoading(true);
        setUserCreateError(null);

        try {
            const apiBase = '';
            const res = await fetch(`${apiBase}/api/compliance/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setShowNewUserDialog(false);
                setNewUserName("");
                setNewUserEmail("");
                setNewUserPassword("");
                fetchComplianceUsers();
            } else {
                setUserCreateError(data.error || "Failed to create user");
            }
        } catch (err) {
            console.error('Failed to create user:', err);
            setUserCreateError("An unexpected error occurred");
        } finally {
            setUserCreateLoading(false);
        }
    };

    const handleShareProject = async (userId: string, projectId: string, isShared: boolean) => {
        try {
            const apiBase = '';
            await fetch(`${apiBase}/api/compliance/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId,
                    projectId,
                    action: isShared ? 'share' : 'unshare',
                }),
            });
            fetchComplianceUsers();
        } catch (err) {
            console.error('Failed to update share:', err);
        }
    };

    const openNewProjectDialog = () => {
        fetchFrameworks();
        setProjectName('');
        setSelectedFramework('');
        setStartDate('');
        setEndDate('');
        setDueDate('');
        setDescription('');
        setScope('');
        setCreateError(null);
        setCreateSuccess(null);
        setShowNewProjectDialog(true);
    };

    useEffect(() => {
        fetchDashboard();
        fetchComplianceUsers();
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
                <Button onClick={fetchDashboard} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                </Button>
            </div>
        );
    }

    if (!dashboardData) {
        return null;
    }

    const { stats, projects, assignedAuditors } = dashboardData;

    return (

        <div className="space-y-8 p-4 md:p-8 bg-background min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 rounded-xl shadow-sm border border-border gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary-500">Welcome back, {user?.name}!</h1>
                    <p className="mt-1">Manage your compliance projects and sharing</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowIssueDialog(true)}>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Report Issue
                    </Button>
                    <Button variant="default" size="sm" onClick={openNewProjectDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Project
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { fetchDashboard(); fetchComplianceUsers(); }}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Compliance Projection - Takes 3 columns */}
                <div className="col-span-full lg:col-span-3">
                    <ComplianceProjectionCard
                        onStartProject={(frameworkId) => {
                            fetchFrameworks();
                            setSelectedFramework(frameworkId);
                            setProjectName('');
                            setStartDate('');
                            setEndDate('');
                            setDueDate('');
                            setDescription('');
                            setScope('');
                            setShowNewProjectDialog(true);
                        }}
                    />
                </div>

                {/* Stats Cards - Takes 4 columns */}
                <div className="col-span-full lg:col-span-4 grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                            <Folder className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalProjects}</div>
                            <p className="text-xs text-muted-foreground">Active compliance projects</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Evidence Items</CardTitle>
                            <FileCheck className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.totalEvidence}</div>
                            <p className="text-xs text-muted-foreground">Documents uploaded</p>
                        </CardContent>
                    </Card>

                    <Card className="col-span-full">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <CircularProgress value={stats.overallCompliance} size="lg" />
                            <div>
                                <p className="text-sm font-medium">Average Score</p>
                                <p className="text-xs text-muted-foreground">Across all projects</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Rejected Projects */}
            {projects.filter((p: Project) => p.status === 'rejected').length > 0 && (
                <Card className="border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <XCircle className="w-5 h-5" />
                            Rejected Projects
                        </CardTitle>
                        <CardDescription>These project requests were not approved</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {projects.filter((p: Project) => p.status === 'rejected').map((project: Project) => (
                            <div key={project.id} className="p-4 rounded-lg bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium">{project.name}</p>
                                        <p className="text-sm text-muted-foreground">{project.framework}</p>
                                    </div>
                                    <Badge variant="destructive">Rejected</Badge>
                                </div>
                                {project.rejectionReason && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/50 rounded border border-red-200 dark:border-red-800">
                                        <p className="text-sm font-medium text-red-700 dark:text-red-400">Rejection Reason:</p>
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{project.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Pending Projects */}
            {projects.filter((p: Project) => p.status === 'pending').length > 0 && (
                <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-950/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                            <Clock className="w-5 h-5" />
                            Pending Approval
                        </CardTitle>
                        <CardDescription>These project requests are awaiting manager review</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {projects.filter((p: Project) => p.status === 'pending').map((project: Project) => (
                            <div key={project.id} className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{project.name}</p>
                                        <p className="text-sm text-muted-foreground">{project.framework}</p>
                                    </div>
                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Assigned Auditors */}
            {assignedAuditors && assignedAuditors.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Assigned Auditors</CardTitle>
                        <CardDescription>Your auditing team</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {assignedAuditors.map((auditor) => (
                            <div key={auditor.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={auditor.avatarUrl || undefined} alt={auditor.name} />
                                        <AvatarFallback>{auditor.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{auditor.name}</p>
                                        <p className="text-sm text-muted-foreground">{auditor.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => chatContext?.openChat(auditor.id)}
                                    disabled={!chatContext}
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Message
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}


            {/* Audit Requests Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight">Audit Requests</h2>
                <Card>
                    <CardHeader>
                        <CardTitle>Open Requests</CardTitle>
                        <CardDescription>Requests from your auditor requiring attention.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {requests.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground">
                                    <p>No open requests.</p>
                                </div>
                            ) : (
                                requests.map((req) => (
                                    <div key={req.id} className="flex flex-col sm:flex-row items-start justify-between p-4 border rounded-lg gap-4">
                                        <div className="w-full">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{req.title}</h3>
                                                <Badge
                                                    className={
                                                        req.status === 'resolved' ? 'bg-green-500 hover:bg-green-600' :
                                                            req.status === 'escalated' ? 'bg-red-500 hover:bg-red-600' :
                                                                req.status === 'open' ? 'bg-orange-500 hover:bg-orange-600' :
                                                                    'bg-gray-500'
                                                    }
                                                >
                                                    {req.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2 break-words">{req.description}</p>
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/80">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3 h-3 flex-shrink-0" />
                                                    {req.auditor.name}
                                                </span>
                                                {req.project && (
                                                    <span className="flex items-center gap-1">
                                                        <Folder className="w-3 h-3 flex-shrink-0" />
                                                        {req.project.name}
                                                    </span>
                                                )}
                                                {req.dueDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 flex-shrink-0" />
                                                        Due: {new Date(req.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Projects Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Projects</h2>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <div className="grid gap-4 max-h-[500px] overflow-y-auto pr-2">
                            {projects.filter((p: Project) => ['approved', 'completed', 'review_pending'].includes(p.status || 'approved') || !p.status).length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No active projects assigned yet</p>
                                </div>
                            ) : (
                                projects.filter((p: Project) => ['approved', 'completed', 'review_pending'].includes(p.status || 'approved') || !p.status).map((project: Project) => (
                                    <div key={project.id} className="relative">
                                        {project.status === 'review_pending' && (
                                            <Badge className="absolute top-2 right-2 z-10 bg-orange-500">Gone for Review</Badge>
                                        )}
                                        {project.status === 'completed' && (
                                            <Badge className="absolute top-2 right-2 z-10 bg-green-500">Completed</Badge>
                                        )}
                                        <ProjectCard
                                            id={project.id}
                                            name={project.name}
                                            framework={project.framework}
                                            progress={project.status === 'completed' ? 100 : project.progress}
                                            dueDate={project.dueDate}
                                            auditor={project.auditor}
                                            controlsComplete={project.controlsComplete}
                                            controlsTotal={project.controlsTotal}
                                            onClick={() => router.push(`/dashboard/project/${project.id}`)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Compliance Sharing Section */}
            <div className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight">Compliance Sharing</h2>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Compliance Users
                            </CardTitle>
                            <CardDescription>
                                Create read-only accounts for third parties to view specific project compliance status.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowNewUserDialog(true)}>
                            <Users className="w-4 h-4 mr-2" />
                            Create User
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Shared Projects</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {complianceUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.name}</TableCell>
                                            <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {projects.map((project) => {
                                                        const isShared = user.sharedProjects.some(sp => sp.project.id === project.id);
                                                        return (
                                                            <div key={project.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md text-sm">
                                                                <span>{project.name}</span>
                                                                <Switch
                                                                    checked={isShared}
                                                                    onCheckedChange={(checked) => handleShareProject(user.id, project.id, checked)}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {complianceUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                No compliance users created yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* New Project Dialog */}
            < Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog} >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Request New Project</DialogTitle>
                        <DialogDescription>
                            Select a compliance framework and provide a project name.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="projectName">Project Name</Label>
                            <Input
                                id="projectName"
                                placeholder="e.g., Q1 2024 SOC 2 Audit"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Compliance Framework</Label>
                            <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a framework" />
                                </SelectTrigger>
                                <SelectContent>
                                    {frameworks.map((framework) => (
                                        <SelectItem key={framework.id} value={framework.id}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>{framework.name}</span>
                                                <Badge variant="secondary" className="ml-2">
                                                    {framework._count.controls} controls
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Project description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="scope">Scope</Label>
                            <Input
                                id="scope"
                                placeholder="Project scope"
                                value={scope}
                                onChange={(e) => setScope(e.target.value)}
                            />
                        </div>

                        {createError && (
                            <p className="text-sm text-destructive">{createError}</p>
                        )}

                        {createSuccess && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Clock className="w-4 h-4" />
                                {createSuccess}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateProject} disabled={createLoading || !!createSuccess}>
                            {createLoading ? "Submitting..." : "Submit Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* New Compliance User Dialog */}
            < Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog} >
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Compliance User</DialogTitle>
                        <DialogDescription>
                            Create a read-only account for a third-party auditor or stakeholder.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="userName">Name</Label>
                            <Input id="userName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="userEmail">Email</Label>
                            <Input id="userEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="userPassword">Password</Label>
                            <Input id="userPassword" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                        </div>
                        {userCreateError && (
                            <p className="text-sm text-destructive">{userCreateError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateComplianceUser} disabled={userCreateLoading}>
                            {userCreateLoading ? "Creating..." : "Create User"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            {/* Report Issue Dialog */}
            < Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Report an Issue</DialogTitle>
                        <DialogDescription>
                            Describe the issue you are facing with a specific project. A manager will review it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Project</Label>
                            <Select value={issueProject} onValueChange={setIssueProject}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {projects.filter(p => !p.status || p.status !== 'rejected').map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Title</Label>
                            <Input placeholder="Issue Title" value={issueTitle} onChange={(e) => setIssueTitle(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Detailed Description</Label>
                            <Textarea
                                placeholder="Describe the issue... (e.g. Evidence rejection, clarification needed)"
                                value={issueDescription}
                                onChange={(e) => setIssueDescription(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        {issueSuccess && <p className="text-green-600 text-sm mt-2 flex items-center gap-2">Issue reported successfully!</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
                        <Button onClick={handleReportIssue} disabled={issueLoading}>
                            {issueLoading ? 'Sending...' : 'Report Issue'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

        </div >
    );
}
