"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
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
    Plus,
    Clock
} from "lucide-react";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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
    userTimeMetrics?: {
        totalDuration: number;
        reviewDuration: number;
        auditDuration: number;
    };
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export function AuditorDashboardView() {
    const { user, token } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [isMeetingOpen, setIsMeetingOpen] = useState(false);
    const [meetingDate, setMeetingDate] = useState("");
    const [meetingDuration, setMeetingDuration] = useState("60");
    const [meetingTitle, setMeetingTitle] = useState("Audit Review Meeting");
    const [meetingAttendees, setMeetingAttendees] = useState("");
    const [meetingReason, setMeetingReason] = useState("");
    const [scheduling, setScheduling] = useState(false);

    const [hostEmail, setHostEmail] = useState("");

    // Set default host email when user data is loaded
    useEffect(() => {
        if (user?.email) {
            setHostEmail(user.email);
        }
    }, [user]);

    const handleScheduleMeeting = async () => {
        if (!meetingDate || !meetingAttendees || !hostEmail) {
            toast({ title: "Missing Information", description: "Please provide a date, host, and attendees.", variant: "destructive" });
            return;
        }
        setScheduling(true);
        try {
            // Calculate End Time
            const startTime = new Date(meetingDate);
            const durationMinutes = parseInt(meetingDuration);
            const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            const res = await fetch(`${apiUrl}/api/auditor/meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: meetingTitle,
                    hostEmail: hostEmail,
                    date: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    duration: durationMinutes,
                    attendees: meetingAttendees,
                    reason: meetingReason
                })
            });

            if (res.ok) {
                toast({ title: "Meeting Request Sent", description: "The workflow has been triggered." });
                setIsMeetingOpen(false);
                setMeetingDate("");
                setMeetingAttendees("");
                setMeetingReason("");
            } else {
                throw new Error("Failed to schedule");
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Could not send meeting request.", variant: "destructive" });
        } finally {
            setScheduling(false);
        }
    };

    const [availableHosts, setAvailableHosts] = useState<{ email: string; name: string; role: string }[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
                const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

                // Fetch stats
                const res = await fetch(`${apiUrl}/api/auditor/dashboard`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data.stats);
                }

                // Fetch available hosts
                const usersRes = await fetch(`${apiUrl}/api/auditor/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (usersRes.ok) {
                    const data = await usersRes.json();
                    setAvailableHosts(data.data);
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
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
                    <Dialog open={isMeetingOpen} onOpenChange={setIsMeetingOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <CalendarIcon className="mr-2 h-4 w-4" /> Set Meeting
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Schedule Client Meeting</DialogTitle>
                                <DialogDescription>
                                    Set a time to discuss the audit report. This will trigger a workflow to send invites.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right">Title</Label>
                                    <Input id="title" className="col-span-3" value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="host" className="text-right">Host Email</Label>
                                    <Input id="host" list="host-emails" value={hostEmail} onChange={(e) => setHostEmail(e.target.value)} className="col-span-3" />
                                    <datalist id="host-emails">
                                        {availableHosts.map((host) => (
                                            <option key={host.email} value={host.email}>{host.name} ({host.role})</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="date" className="text-right">Time</Label>
                                    <Input id="date" type="datetime-local" className="col-span-3" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="duration" className="text-right">Duration</Label>
                                    <select
                                        id="duration"
                                        className="col-span-3 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={meetingDuration}
                                        onChange={(e) => setMeetingDuration(e.target.value)}
                                    >
                                        <option value="15">15 Minutes</option>
                                        <option value="30">30 Minutes</option>
                                        <option value="45">45 Minutes</option>
                                        <option value="60">1 Hour</option>
                                        <option value="90">1.5 Hours</option>
                                        <option value="120">2 Hours</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="attendees" className="text-right">Invitees</Label>
                                    <Input id="attendees" placeholder="client@example.com" className="col-span-3" value={meetingAttendees} onChange={(e) => setMeetingAttendees(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="reason" className="text-right">Reason</Label>
                                    <Textarea id="reason" placeholder="Discuss Findings..." className="col-span-3" value={meetingReason} onChange={(e) => setMeetingReason(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleScheduleMeeting} disabled={scheduling}>
                                    {scheduling ? "Scheduling..." : "Send Request"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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
                        <CardTitle className="text-sm font-medium">My Time (Audit / Review)</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.userTimeMetrics ? formatDuration(stats.userTimeMetrics.auditDuration) : '0h 0m'}
                            <span className="text-muted-foreground font-normal text-sm mx-1">/</span>
                            <span>
                                {stats?.userTimeMetrics ? formatDuration(stats.userTimeMetrics.reviewDuration) : '0h 0m'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total: {stats?.userTimeMetrics ? formatDuration(stats.userTimeMetrics.totalDuration) : '0h 0m'}
                        </p>
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
