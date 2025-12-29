"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Chart } from "react-google-charts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface ProjectMetricsData {
    id: string;
    name: string;
    customerName: string;
    status: string;
    startDate: string | null;
    dueDate: string | null;
    endDate: string | null;
    metrics: {
        progress: number;
        completedControls: number;
        totalControls: number;
        totalEvidence: number;
        totalDuration: number;
        reviewDuration?: number;
        auditDuration?: number;
    };
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

export function ProjectMetrics() {
    const { token } = useAuth();
    const [projects, setProjects] = useState<ProjectMetricsData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            if (!token) return;
            try {
                const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
                const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

                const res = await fetch(`${apiUrl}/api/auditor/projects`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch projects:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [token]);

    useEffect(() => {
        if (projects.length > 0) {
            console.log('[DEBUG] ProjectMetrics received projects:', projects);
            projects.forEach(p => console.log(`[DEBUG] Project ${p.name} duration:`, p.metrics.totalDuration));
        }
    }, [projects]);

    if (loading) {
        return <div>Loading metrics...</div>;
    }

    // Prepare Gantt Data
    const ganttData = [
        [
            { type: "string", label: "Task ID" },
            { type: "string", label: "Task Name" },
            { type: "string", label: "Resource" },
            { type: "date", label: "Start Date" },
            { type: "date", label: "End Date" },
            { type: "number", label: "Duration" },
            { type: "number", label: "Percent Complete" },
            { type: "string", label: "Dependencies" },
        ],
        ...projects.map(p => {
            // Use real dates or fallbacks
            const startDate = p.startDate ? new Date(p.startDate) : new Date();
            // Use end date if completed, otherwise due date, otherwise default
            const endDate = p.endDate ? new Date(p.endDate) : (p.dueDate ? new Date(p.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

            return [
                p.id,
                p.name,
                p.customerName,
                startDate,
                endDate,
                null,
                p.metrics.progress,
                null
            ];
        })
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {projects.map(project => (
                    <Link key={project.id} href={`/dashboard/project/${project.id}`} className="block h-full">
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg hover:underline">{project.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{project.customerName}</p>
                                    </div>
                                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                                        {project.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Overall Progress</span>
                                            <span className="font-medium">{project.metrics.progress}%</span>
                                        </div>
                                        <Progress value={project.metrics.progress} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Controls</p>
                                            <p className="font-medium">
                                                {project.metrics.completedControls} / {project.metrics.totalControls}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Evidence Items</p>
                                            <p className="font-medium">{project.metrics.totalEvidence}</p>
                                        </div>
                                        <div className="col-span-2 mt-2 pt-2 border-t flex justify-between items-center text-sm">
                                            <div>
                                                <p className="text-muted-foreground text-xs uppercase tracking-wide">Audit Time</p>
                                                <p className="font-bold text-lg">
                                                    {formatDuration(project.metrics.auditDuration || (project.metrics.totalDuration - (project.metrics.reviewDuration || 0)))}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-xs uppercase tracking-wide">Review Time</p>
                                                <p className="font-bold text-lg">
                                                    {formatDuration(project.metrics.reviewDuration || 0)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {projects.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Project Timelines</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[400px] w-full overflow-x-auto">
                            <Chart
                                chartType="Gantt"
                                width="100%"
                                height="100%"
                                data={ganttData}
                                options={{
                                    height: 400,
                                    gantt: {
                                        trackHeight: 30,
                                        barHeight: 20,
                                    },
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
