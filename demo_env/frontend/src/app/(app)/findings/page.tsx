"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Bell, BellOff, Filter, Cloud } from "lucide-react";

interface Finding {
    id: string;
    title: string;
    alertName: string;
    description: string;
    severity: string;
    category: string;
    status: string;
    notified: boolean;
    affectedResource: string;
    affectedUser: string;
    location: string;
    cloudService: string;
    integration: { name: string; vendor: string };
    firstSeenAt: string;
    lastSeenAt: string;
    occurrenceCount: number;
}

interface Stats {
    total: number;
    bySeverity: { critical?: number; high?: number; medium?: number; low?: number };
    byStatus: { open?: number; investigating?: number; resolved?: number };
}

export default function FindingsPage() {
    const { token } = useAuth();
    const [findings, setFindings] = useState<Finding[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchFindings();
            fetchStats();
        }
    }, [token]);

    const fetchFindings = async () => {
        try {
            const res = await fetch('/api/findings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setFindings(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch findings", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/findings/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setStats(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch stats", error);
        }
    };

    const getSeverityBadge = (severity: string) => {
        const variants: any = {
            critical: "destructive",
            high: "destructive",
            medium: "default",
            low: "secondary",
            info: "outline"
        };
        const colors: any = {
            critical: "text-red-600",
            high: "text-orange-600",
            medium: "text-yellow-600",
            low: "text-blue-600",
            info: "text-gray-600"
        };
        return (
            <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${colors[severity]}`} />
                <Badge variant={variants[severity] || "secondary"}>{severity}</Badge>
            </div>
        );
    };

    const getStatusBadge = (status: string) => {
        const variants: any = {
            open: "destructive",
            investigating: "default",
            in_progress: "default",
            resolved: "outline"
        };
        return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
    };

    const getCloudServiceBadge = (service: string) => {
        if (!service) return <span className="text-muted-foreground">-</span>;
        return (
            <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                <span className="text-sm font-medium">{service}</span>
            </div>
        );
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Findings</h1>
                    <p className="text-muted-foreground mt-1">
                        Centralized view of security findings from CASB integrations and agents
                    </p>
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                </Button>
            </div>

            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Total Findings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Critical</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {stats.bySeverity?.critical || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">High</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {stats.bySeverity?.high || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Open</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.byStatus?.open || 0}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Alerts</CardTitle>
                    <CardDescription>Review and manage security findings</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading findings...</div>
                    ) : findings.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No findings detected. Configure CASB integrations to start collecting security data.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Alert Time</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Alert Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Notified</TableHead>
                                    <TableHead>Cloud Service</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {findings.map((finding) => (
                                    <TableRow key={finding.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(finding.firstSeenAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {finding.location || <span className="text-muted-foreground">Unavailable</span>}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {finding.affectedUser || <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {finding.alertName || finding.title}
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">
                                            {finding.category.replace('_', ' ')}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(finding.status)}</TableCell>
                                        <TableCell>
                                            {finding.notified ? (
                                                <Bell className="w-4 h-4 text-blue-600" />
                                            ) : (
                                                <BellOff className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </TableCell>
                                        <TableCell>{getCloudServiceBadge(finding.cloudService)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
