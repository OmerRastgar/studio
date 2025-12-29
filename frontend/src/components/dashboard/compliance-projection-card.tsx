
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth/kratos-auth-provider";

interface Projection {
    id: string;
    name: string;
    covered: number;
    total: number;
    percentage: number;
    hasProject?: boolean;
    projectId?: string;
    projectStatus?: string;
}

interface ComplianceProjectionCardProps {
    onStartProject?: (frameworkId: string) => void;
}

export function ComplianceProjectionCard({ onStartProject }: ComplianceProjectionCardProps) {
    const { token } = useAuth();
    const [projections, setProjections] = useState<Projection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchProjection = async () => {
            try {
                if (!token) return;

                const res = await fetch('/api/compliance/projection', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const json = await res.json();
                    if (json.success) {
                        // Sort by percentage desc
                        setProjections(json.data.sort((a: Projection, b: Projection) => b.percentage - a.percentage));
                    }
                } else {
                    setError(`Failed to load data: ${res.status}`);
                }
            } catch (error) {
                console.error("Failed to load compliance projection", error);
                setError("Network error loading projection");
            } finally {
                setLoading(false);
            }
        };

        fetchProjection();
    }, [token]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Compliance Intelligence</CardTitle>
                    <CardDescription>Analyzing your potential coverage...</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
            </Card>
        );
    }

    // if (projections.length === 0) {
    //    return null; // Don't hide it, show empty state inside the card
    // }

    return (
        <Card className="col-span-full lg:col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Compliance Projection
                        </CardTitle>
                        <CardDescription>
                            See how your existing evidence applies to other standards.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded text-sm mb-4">
                            {error}
                        </div>
                    )}
                    {/* DEBUG: Projections Count: {projections.length} */}
                    {!loading && !error && projections.length > 0 ? (
                        projections.map((proj) => (
                            <div key={proj.id} className="group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                        <h4 className="font-semibold text-sm truncate max-w-[200px] sm:max-w-none">{proj.name}</h4>
                                        {proj.percentage > 0 && (
                                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                                                {proj.percentage}% ready
                                            </Badge>
                                        )}
                                        {proj.percentage === 0 && (
                                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 whitespace-nowrap">
                                                Add evidence with tags
                                            </Badge>
                                        )}
                                        {proj.hasProject && (
                                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                                {proj.projectStatus === 'approved' && '✓ Active'}
                                                {proj.projectStatus === 'in_progress' && '⏳ In Progress'}
                                                {proj.projectStatus === 'review_pending' && '👁 Under Review'}
                                                {proj.projectStatus === 'rejected' && '✗ Rejected'}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {proj.covered}/{proj.total} controls
                                        </span>
                                        {!proj.hasProject && proj.percentage > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStartProject?.(proj.id);
                                                }}
                                            >
                                                Start Project
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <Progress value={proj.percentage} className="h-2" />
                            </div>
                        ))
                    ) : (
                        !loading && !error && (
                            <div className="text-center text-muted-foreground text-sm py-4">
                                No projection data available. Upload evidence to see cross-standard insights.
                            </div>
                        )
                    )}



                </div>
            </CardContent>
        </Card>
    );
}

