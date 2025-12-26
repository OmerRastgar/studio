"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Server,
    HardDrive,
    Wifi,
    Clock,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useToast } from "@/hooks/use-toast";

interface AgentDetailsDialogProps {
    agentId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
}

export function AgentDetailsDialog({ agentId, open, onOpenChange, onUpdate }: AgentDetailsDialogProps) {
    const { token } = useAuth();
    const { toast } = useToast();
    const [agent, setAgent] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (agentId && open) {
            fetchAgentDetails();
            fetchProjects();
        }
    }, [agentId, open]);

    const fetchAgentDetails = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/agents/${agentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setAgent(json.data);
                setSelectedProject(json.data.projectId || "");
            }
        } catch (error) {
            console.error("Failed to fetch agent details", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/customer/projects', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success || Array.isArray(json)) {
                setProjects(Array.isArray(json) ? json : json.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch projects", error);
        }
    };

    const handleSaveProject = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/agents/${agentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ projectId: selectedProject || null })
            });

            const json = await res.json();
            if (json.success) {
                toast({
                    title: "Project Assigned",
                    description: `Agent successfully assigned to project.`
                });
                if (onUpdate) onUpdate();
            } else {
                throw new Error(json.error);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to assign project"
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading || !agent) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-center items-center py-8">
                        <Activity className="w-6 h-6 animate-spin" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const getStatusColor = (status: string) => {
        const colors: any = {
            Active: "text-green-600",
            Offline: "text-gray-600",
            Error: "text-red-600",
            Inactive: "text-gray-400",
            Pending: "text-yellow-600"
        };
        return colors[status] || "text-gray-600";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Server className="w-5 h-5" />
                        {agent.name}
                    </DialogTitle>
                    <DialogDescription>
                        Device details, evidence, and project assignment
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="evidence">Evidence ({agent._count?.evidence || 0})</TabsTrigger>
                        <TabsTrigger value="findings">Findings ({agent._count?.findings || 0})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        {/* Status Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Status & Health</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Current Status</span>
                                    <Badge className={getStatusColor(agent.status)}>{agent.status}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Last Seen</span>
                                    <span className="text-sm font-medium">
                                        {agent.lastSeenAt ? formatDistanceToNow(new Date(agent.lastSeenAt), { addSuffix: true }) : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Last Sync</span>
                                    <span className="text-sm font-medium">
                                        {agent.lastSync ? formatDistanceToNow(new Date(agent.lastSync), { addSuffix: true }) : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Agent Version</span>
                                    <Badge variant="outline">{agent.version || 'Unknown'}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Device Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Device Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Hostname</div>
                                            <div className="text-sm font-mono">{agent.hostname || 'Not available'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Wifi className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">IP Address</div>
                                            <div className="text-sm font-mono">{agent.ipAddress || 'Not available'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Platform</div>
                                            <div className="text-sm capitalize">{agent.platform}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">OS Version</div>
                                            <div className="text-sm">{agent.osVersion || 'Not available'}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Project Assignment */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">Project Assignment</CardTitle>
                                <CardDescription>
                                    Assign this agent to a project to collect evidence and run osquery
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="project">Assigned Project</Label>
                                    <Select
                                        value={selectedProject || undefined}
                                        onValueChange={setSelectedProject}
                                    >
                                        <SelectTrigger id="project">
                                            <SelectValue placeholder="No project assigned" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((project) => (
                                                <SelectItem key={project.id} value={project.id}>
                                                    {project.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedProject && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedProject("")}
                                            className="w-full"
                                        >
                                            Clear Assignment
                                        </Button>
                                    )}
                                </div>
                                {agent.project && (
                                    <div className="p-3 bg-muted rounded-md">
                                        <div className="text-sm font-medium">{agent.project.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Currently assigned project
                                        </div>
                                    </div>
                                )}
                                <Button
                                    onClick={handleSaveProject}
                                    disabled={saving || selectedProject === (agent.projectId || "")}
                                    className="w-full"
                                >
                                    {saving ? "Saving..." : "Save Assignment"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Evidence Items
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{agent._count?.evidence || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Security Findings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{agent._count?.findings || 0}</div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="evidence" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Recent Evidence</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {agent.evidence && agent.evidence.length > 0 ? (
                                    <div className="space-y-2">
                                        {agent.evidence.slice(0, 10).map((evidence: any) => (
                                            <div key={evidence.id} className="flex justify-between items-center p-2 border rounded">
                                                <div>
                                                    <div className="text-sm font-medium">{evidence.fileName}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(evidence.uploadedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{evidence.type}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No evidence collected yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="findings" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Recent Findings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {agent.findings && agent.findings.length > 0 ? (
                                    <div className="space-y-2">
                                        {agent.findings.slice(0, 10).map((finding: any) => (
                                            <div key={finding.id} className="flex justify-between items-center p-2 border rounded">
                                                <div>
                                                    <div className="text-sm font-medium">{finding.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(finding.firstSeenAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <Badge variant={finding.severity === 'critical' || finding.severity === 'high' ? 'destructive' : 'default'}>
                                                    {finding.severity}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No security findings detected
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
