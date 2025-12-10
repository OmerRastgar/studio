"use client";

import { useAuth } from "@/app/auth-provider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Briefcase,
    AlertCircle,
    Calendar as CalendarIcon,
    BarChart3,
    Plus
} from "lucide-react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const CustomerAssignmentList = dynamic(() => import("./auditor/customer-assignment-list").then(mod => mod.CustomerAssignmentList), {
    loading: () => <div className="space-y-2"><Skeleton className="h-[200px] w-full" /></div>
});
const ProjectMetrics = dynamic(() => import("./auditor/project-metrics").then(mod => mod.ProjectMetrics), {
    loading: () => <div className="space-y-2"><Skeleton className="h-[300px] w-full" /></div>
});
const RequestTracker = dynamic(() => import("./auditor/request-tracker").then(mod => mod.RequestTracker), {
    loading: () => <div className="space-y-2"><Skeleton className="h-[150px] w-full" /></div>
});
const AuditCalendar = dynamic(() => import("./auditor/audit-calendar").then(mod => mod.AuditCalendar), {
    loading: () => <div className="space-y-2"><Skeleton className="h-[500px] w-full" /></div>,
    ssr: false // FullCalendar is client-side only
});

interface DashboardStats {
    assignedCustomers: number;
    activeProjects: number;
    pendingRequests: number;
    upcomingEvents: number;
}

export function AuditorDashboardView() {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
                const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

                const res = await fetch(`${apiUrl}/api/auditor/dashboard`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [token]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading dashboard...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Auditor Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {user?.name}. Here's your audit overview.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Audit Request
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assigned Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.assignedCustomers || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.pendingRequests || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.upcomingEvents || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="customers" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="customers">Customers & Projects</TabsTrigger>
                    <TabsTrigger value="requests">Requests</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="space-y-4">
                    <CustomerAssignmentList />
                </TabsContent>

                <TabsContent value="requests" className="space-y-4">
                    <RequestTracker />
                </TabsContent>

                <TabsContent value="calendar" className="space-y-4">
                    <AuditCalendar />
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                    <ProjectMetrics />
                </TabsContent>
            </Tabs>
        </div>
    );
}
