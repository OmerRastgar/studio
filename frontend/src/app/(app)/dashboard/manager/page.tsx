"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth-provider";
import { RouteGuard } from "@/components/route-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import {
    Users,
    FolderCheck,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    RefreshCw,
    UserCheck,
    Building,
    BarChart3,
    ChevronRight
} from "lucide-react";

interface DashboardMetrics {
    totals: {
        projects: number;
        pendingApprovals: number;
        customers: number;
        auditors: number;
    };
    compliance: number;
    projectsByStatus: Array<{ status: string; count: number }>;
}

interface Alert {
    type: string;
    severity: string;
    title: string;
    description: string;
    entityId: string;
    entityType: string;
    createdAt?: string;
    dueDate?: string;
}

interface Auditor {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    projectCount: number;
    avgCompletion: number;
    workload: string;
}

export default function ManagerDashboardPage() {
    return (
        <RouteGuard requiredRoles={['admin', 'manager']}>
            <ManagerDashboardContent />
        </RouteGuard>
    );
}

function ManagerDashboardContent() {
    const { token } = useAuth();
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [auditors, setAuditors] = useState<Auditor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Approval dialog
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Alert | null>(null);
    const [selectedAuditor, setSelectedAuditor] = useState<string>("");
    const [selectedReviewer, setSelectedReviewer] = useState<string>("");
    const [approving, setApproving] = useState(false);

    // Reject dialog
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectProject, setRejectProject] = useState<Alert | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejecting, setRejecting] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
            const [metricsRes, alertsRes, auditorsRes] = await Promise.all([
                fetch(`${apiBase}/api/manager/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiBase}/api/manager/alerts`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${apiBase}/api/manager/auditors`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const [metricsData, alertsData, auditorsData] = await Promise.all([
                metricsRes.json(),
                alertsRes.json(),
                auditorsRes.json()
            ]);

            if (metricsData.success) setMetrics(metricsData.data);
            if (alertsData.success) setAlerts(alertsData.data);
            if (auditorsData.success) setAuditors(auditorsData.data);
        } catch (err) {
            setError('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const handleApprove = async () => {
        if (!selectedProject) return;
        setApproving(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiBase}/api/manager/projects/${selectedProject.entityId}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ auditorId: selectedAuditor, reviewerAuditorId: selectedReviewer })
            });
            const data = await res.json();
            if (data.success) {
                setShowApproveDialog(false);
                setSelectedProject(null);
                setSelectedAuditor("");
                setSelectedReviewer("");
                fetchData();
            }
        } catch (err) {
            console.error('Approval error:', err);
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        if (!rejectProject || !rejectReason.trim()) return;
        setRejecting(true);
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${apiBase}/api/manager/projects/${rejectProject.entityId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: rejectReason.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setShowRejectDialog(false);
                setRejectProject(null);
                setRejectReason("");
                fetchData();
            }
        } catch (err) {
            console.error('Reject error:', err);
        } finally {
            setRejecting(false);
        }
    };

    const openApproveDialog = (alert: Alert) => {
        setSelectedProject(alert);
        setSelectedAuditor("");
        setSelectedReviewer("");
        setShowApproveDialog(true);
    };

    const openRejectDialog = (alert: Alert) => {
        setRejectProject(alert);
        setRejectReason("");
        setShowRejectDialog(true);
    };

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

    const pendingAlerts = alerts.filter(a => a.type === 'pending_approval');
    const otherAlerts = alerts.filter(a => a.type !== 'pending_approval');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Manager Dashboard</h1>
                    <p className="text-muted-foreground">Team oversight and project approvals</p>
                </div>
                <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Metrics Cards */}
            {metrics && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Link href="/projects">
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                                <FolderCheck className="w-4 h-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{metrics.totals.projects}</div>
                                <p className="text-xs text-muted-foreground">Click to view all</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card className={metrics.totals.pendingApprovals > 0 ? "border-orange-500 bg-orange-50/30 dark:bg-orange-950/20" : ""}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                            <Clock className="w-4 h-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${metrics.totals.pendingApprovals > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                                {metrics.totals.pendingApprovals}
                            </div>
                            <p className="text-xs text-muted-foreground">Awaiting review</p>
                        </CardContent>
                    </Card>

                    <Link href="/dashboard/manager/customers">
                        <Card className="hover:border-primary transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Customers</CardTitle>
                                <Building className="w-4 h-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{metrics.totals.customers}</div>
                                <p className="text-xs text-muted-foreground">Click to view profiles</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Auditors</CardTitle>
                            <UserCheck className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{metrics.totals.auditors}</div>
                            <p className="text-xs text-muted-foreground">Team members</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Pending Approvals */}
            {pendingAlerts.length > 0 && (
                <Card className="border-orange-300 dark:border-orange-700 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                            <AlertTriangle className="w-5 h-5" />
                            Pending Project Approvals ({pendingAlerts.length})
                        </CardTitle>
                        <CardDescription>Customer project requests awaiting your review</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingAlerts.map((alert: Alert) => (
                            <div key={alert.entityId} className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-gray-900 border shadow-sm">
                                <div>
                                    <p className="font-medium">{alert.title.replace('Project Approval Required: ', '')}</p>
                                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                                        onClick={() => openRejectDialog(alert)}
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => openApproveDialog(alert)}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Team Performance - Clickable */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Team Performance
                    </CardTitle>
                    <CardDescription>Click on an auditor to view detailed metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    {auditors.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No auditors found</p>
                    ) : (
                        <div className="space-y-3">
                            {auditors.map((auditor: Auditor) => (
                                <Link
                                    key={auditor.id}
                                    href={`/dashboard/manager/auditor/${auditor.id}`}
                                    className="block"
                                >
                                    <div className="flex items-center justify-between p-4 rounded-lg border hover:border-primary hover:bg-accent/50 transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={auditor.avatarUrl || undefined} />
                                                <AvatarFallback>
                                                    {auditor.name.split(' ').map((n: string) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium group-hover:text-primary transition-colors">{auditor.name}</p>
                                                <p className="text-sm text-muted-foreground">{auditor.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{auditor.projectCount} projects</p>
                                                <p className="text-xs text-muted-foreground">{auditor.avgCompletion}% avg completion</p>
                                            </div>
                                            <Badge variant={
                                                auditor.workload === 'high' ? 'destructive' :
                                                    auditor.workload === 'medium' ? 'secondary' : 'outline'
                                            }>
                                                {auditor.workload}
                                            </Badge>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Other Alerts */}
            {otherAlerts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Alerts & Issues
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {otherAlerts.map((alert: Alert, idx: number) => (
                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${alert.severity === 'error' ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30' : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30'
                                }`}>
                                {alert.severity === 'error' ? (
                                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                                )}
                                <div>
                                    <p className="font-medium">{alert.title}</p>
                                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Project</DialogTitle>
                        <DialogDescription>
                            You must assign both an Auditor and a Reviewer to proceed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label>Assign Auditor (Required)</Label>
                            <Select value={selectedAuditor} onValueChange={setSelectedAuditor}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select an auditor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.map((auditor: Auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name} ({auditor.projectCount} projects)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Assign Reviewer (Required)</Label>
                            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Select a reviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {auditors.map((auditor: Auditor) => (
                                        <SelectItem key={auditor.id} value={auditor.id}>
                                            {auditor.name} ({auditor.projectCount} projects)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={approving || !selectedAuditor || !selectedReviewer}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {approving ? "Approving..." : "Approve Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog with Comment */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Project</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejection. This will be visible to the customer.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="reject-reason">Rejection Reason *</Label>
                            <Textarea
                                id="reject-reason"
                                placeholder="Enter the reason for rejecting this project..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="mt-2"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReject}
                            disabled={rejecting || !rejectReason.trim()}
                            variant="destructive"
                        >
                            {rejecting ? "Rejecting..." : "Reject Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
