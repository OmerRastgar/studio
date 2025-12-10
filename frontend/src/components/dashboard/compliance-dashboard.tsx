"use client";

import { useAuth } from "@/app/auth-provider";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectCard } from "@/components/ui/project-card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Folder, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SharedProject {
    id: string;
    name: string;
    framework: {
        name: string;
    };
    projectControls: {
        progress: number;
        evidenceCount: number;
    }[];
    sharedAt: string;
}

export function ComplianceDashboardView() {
    const { user, token } = useAuth();
    const router = useRouter();
    const [projects, setProjects] = useState<SharedProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? 'http://localhost:8000' : '';
            const res = await fetch(`${apiBase}/api/compliance/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error("Failed to fetch dashboard data");
            }

            const data = await res.json();
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
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

    return (
        <div className="grid gap-6 max-w-7xl mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Compliance Overview</h1>
                    <p className="text-muted-foreground">View status of shared projects</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Tabs defaultValue="projects" className="w-full">
                <TabsList>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="mt-6">
                    <div className="grid gap-6">
                        {projects.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
                                    <p>No projects have been shared with you yet.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            projects.map((project) => {
                                // Calculate aggregate progress
                                const totalControls = project.projectControls.length;
                                const avgProgress = totalControls > 0
                                    ? project.projectControls.reduce((acc, curr) => acc + curr.progress, 0) / totalControls
                                    : 0;
                                const totalEvidence = project.projectControls.reduce((acc, curr) => acc + curr.evidenceCount, 0);

                                return (
                                    <ProjectCard
                                        key={project.id}
                                        id={project.id}
                                        name={project.name}
                                        framework={project.framework?.name || 'Unknown Framework'}
                                        progress={Math.round(avgProgress)}
                                        controlsComplete={0} // Not available in simplified view
                                        controlsTotal={totalControls}
                                        onClick={() => router.push(`/dashboard/project/${project.id}`)}
                                        // Hide sensitive info
                                        dueDate={null}
                                        auditor={null}
                                    />
                                );
                            })
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
