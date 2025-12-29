"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { File, ExternalLink, Tag, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

interface EvidenceListProps {
    evidence: Evidence[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
    if (evidence.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-6 bg-muted/30 rounded-lg">
                No evidence uploaded yet. Click "Upload Evidence" to add files.
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getDownloadUrl = (url: string) => {
        if (!url) return '#';

        // If it's already a relative proxy URL, prepend API_URL (which is empty string usually, so relative to domain)
        if (url.startsWith('/api/uploads/download')) {
            return url;
        }

        // If it's a legacy MinIO URL (internal docker DNS), convert to proxy URL
        // Format: http://minio:9000/evidence/PROJECTID/FILEID.ext
        if (url.includes('minio:9000')) {
            try {
                // Extract project ID and filename from URL
                // url parts: http:, , minio:9000, evidence, projectId, filename
                const parts = url.split('/');
                const filenameIndex = parts.length - 1;
                const projectIdIndex = parts.length - 2;

                if (filenameIndex > 0 && projectIdIndex > 0) {
                    const filename = parts[filenameIndex];
                    const projectId = parts[projectIdIndex];
                    return `/api/uploads/download/${projectId}/${filename}`;
                }
            } catch (e) {
                console.error('Failed to parse legacy URL', e);
            }
        }

        return url;
    };

    const router = useRouter();

    return (
        <div className="space-y-2">
            {evidence.map((item) => (
                <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 active:bg-muted/70 active:scale-[0.99] transition-all duration-200"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <File className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.fileName}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                {item.uploadedBy && (
                                    <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {item.uploadedBy.name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        {/* Tags */}
                        {item.tags.length > 0 && (
                            <div className="hidden md:flex items-center gap-1">
                                {item.tags.slice(0, 2).map((tag, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className={cn(
                                            "text-xs",
                                            item.tagSource === "tagging_engine" && "bg-blue-100 text-blue-700"
                                        )}
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                                {item.tags.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{item.tags.length - 2}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Tag Source Indicator */}
                        {item.tagSource === "tagging_engine" && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                                AI Tagged
                            </Badge>
                        )}

                        {/* View Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/evidence/${item.id}/view`)}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
