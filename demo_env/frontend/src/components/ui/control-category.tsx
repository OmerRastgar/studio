"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ControlItem } from "@/components/ui/control-item";
import { ChevronDown, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Control {
    id: string;
    controlId: string;
    code: string;
    title: string;
    description: string;
    tags: string[];
    progress: number;
    evidenceCount: number;
    evidence: any[];
    notes: string | null;
}

interface ControlCategoryProps {
    name: string;
    controls: Control[];
    allControls?: Array<{ id: string; control: { code: string; title: string }; tags?: string[] }>;
    totalControls: number;
    completedControls: number;
    progress: number;
    projectId: string;
    onEvidenceUploaded?: () => void;
    hideEvidence?: boolean;
    readOnly?: boolean;
}

export function ControlCategory({
    name,
    controls,
    allControls = [],
    totalControls,
    completedControls,
    progress,
    projectId,
    onEvidenceUploaded,
    hideEvidence = false,
    readOnly = false,
}: ControlCategoryProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isComplete = progress === 100;

    return (
        <Card className={cn(
            "transition-all duration-200",
            isComplete && "border-green-500/30 bg-green-500/5"
        )}>
            <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <CardTitle className="text-lg">{name}</CardTitle>
                        {isComplete ? (
                            <Badge variant="default" className="bg-green-500">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Complete
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                {completedControls} / {totalControls}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{progress}%</span>
                        <Progress value={progress} className="w-24 h-2" />
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="pt-0">
                    <div className="space-y-3 border-t pt-4">
                        {controls.map((control) => (
                            <ControlItem
                                key={control.id}
                                id={control.id}
                                controlId={control.controlId}
                                code={control.code}
                                title={control.title}
                                description={control.description}
                                tags={control.tags}
                                progress={control.progress}
                                evidenceCount={control.evidenceCount}
                                evidence={control.evidence}
                                notes={control.notes}
                                projectId={projectId}
                                allControls={allControls}
                                onEvidenceUploaded={onEvidenceUploaded}
                                hideEvidence={hideEvidence}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
