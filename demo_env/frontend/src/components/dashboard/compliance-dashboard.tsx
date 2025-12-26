"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
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
    frameworkName: string;
    progress: number;
    status: string;
    startDate: string | null;
    dueDate: string | null;
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
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/compliance/dashboard`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            // Backend returns { stats, projects }
            if (data.projects && Array.isArray(data.projects)) {
                setProjects(data.projects);
            } else {
                setProjects([]);
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
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
                            projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    id={project.id}
                                    name={project.name}
                                    framework={project.frameworkName || 'Unknown Framework'}
                                    progress={project.progress || 0}
                                    controlsComplete={0} // Not available in simplified view
                                    controlsTotal={100} // Placeholder or remove controlsTotal prop if optional
                                    onClick={() => router.push(`/dashboard/project/${project.id}`)}
                                    // Hide sensitive info
                                    dueDate={project.dueDate}
                                    auditor={null}
                                />
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
