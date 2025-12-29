"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EvidenceList } from "@/components/ui/evidence-list";
import { EvidenceUploadDialog } from "@/components/ui/evidence-upload-dialog";
import { ChevronDown, ChevronRight, FileText, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { CircularSlider } from "@/components/ui/circular-slider";

interface Evidence {
    id: string;
    fileName: string;
    fileUrl: string;
    tags: string[];
    tagSource: string;
    createdAt: string;
    uploadedBy: {
        id: string;
        name: string;
    } | null;
}

interface ControlItemProps {
    id: string;
    controlId: string;
    code: string;
    title: string;
    description: string;
    tags: string[];
    progress: number;
    evidenceCount: number;
    evidence: Evidence[];
    notes: string | null;
    projectId: string;
    allControls?: Array<{ id: string; control: { code: string; title: string }; tags?: string[] }>;
    onEvidenceUploaded?: () => void;
    hideEvidence?: boolean;
    readOnly?: boolean;
}

export function ControlItem({
    id,
    controlId,
    code,
    title,
    description,
    tags,
    progress,
    evidenceCount,
    evidence,
    notes,
    projectId,
    allControls = [],
    onEvidenceUploaded,
    hideEvidence = false,
    readOnly = false,
}: ControlItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);

    const isComplete = progress === 100;

    return (
        <div className={cn(
            "border rounded-lg p-4 transition-all duration-200",
            isComplete ? "border-green-500/30 bg-green-500/5" : "border-border"
        )}>
            {/* Control Header */}
            <div
                className="flex flex-col sm:flex-row items-start justify-between cursor-pointer gap-4 sm:gap-0"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-3 flex-1">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                    ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">
                                {code}
                            </Badge>
                            <span className="font-medium break-words max-w-full">{title}</span>
                        </div>
                        {!isExpanded && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1 break-all">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-0 sm:ml-4 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{evidenceCount}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[100px] justify-end">
                        <CircularSlider
                            value={progress}
                            size={36}
                            strokeWidth={4}
                            readOnly={true}
                            snapValues={[0, 25, 50, 75, 100]}
                            trackColor="text-muted/20"
                            progressColor={progress === 100 ? "text-green-500" : "text-blue-500"}
                        />
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="mt-4 ml-0 sm:ml-7 space-y-4 px-1 sm:px-0">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground break-words">{description}</p>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <Tag className="w-4 h-4 text-muted-foreground" />
                            {tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {notes && (
                        <div className="text-sm p-3 bg-muted/50 rounded-lg">
                            <span className="font-medium">Notes: </span>
                            {notes}
                        </div>
                    )}

                    {/* Evidence Section */}
                    {!hideEvidence && (
                        <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-sm">Evidence ({evidenceCount})</h4>
                                {!readOnly && (
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowUploadDialog(true);
                                        }}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Upload Evidence
                                    </Button>
                                )}
                            </div>

                            <EvidenceList evidence={evidence} />
                        </div>
                    )}
                </div>
            )}

            {/* Upload Dialog */}
            {!readOnly && !hideEvidence && (
                <EvidenceUploadDialog
                    open={showUploadDialog}
                    onOpenChange={setShowUploadDialog}
                    projectId={projectId}
                    controlId={id}
                    controlCode={code}
                    controlTags={tags}
                    controls={allControls}
                    onSuccess={() => {
                        setShowUploadDialog(false);
                        onEvidenceUploaded?.();
                    }}
                />
            )}
        </div>
    );
}
