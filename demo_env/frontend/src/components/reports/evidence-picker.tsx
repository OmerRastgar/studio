"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Link as LinkIcon, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidencePickerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    evidence: any[];
    onSelect: (selectedIds: string[]) => void;
}

export function EvidencePicker({ isOpen, onOpenChange, evidence, onSelect }: EvidencePickerProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const handleSubmit = () => {
        onSelect(selectedIds);
        setSelectedIds([]);
        onOpenChange(false);
    };

    const getIcon = (type: string) => {
        if (type === 'image') return <ImageIcon className="h-4 w-4" />;
        if (type === 'link') return <LinkIcon className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Select Evidence from Store</DialogTitle>
                    <DialogDescription>
                        Choose files from the project evidence store to link to this control.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[400px] border rounded-md p-4">
                    <div className="grid grid-cols-1 gap-2">
                        {evidence.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                No evidence files found in project store.
                            </div>
                        ) : (
                            evidence.map(item => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                                        selectedIds.includes(item.id) ? "border-primary bg-primary/5" : "border-border"
                                    )}
                                    onClick={() => toggleSelection(item.id)}
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(item.id)}
                                        onCheckedChange={() => toggleSelection(item.id)}
                                    />
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-muted rounded">
                                                {getIcon(item.type)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{item.fileName}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Uploaded by {item.uploadedBy?.name} • {new Date(item.uploadedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        {item.tags && item.tags.length > 0 && (
                                            <div className="flex gap-1">
                                                {item.tags.map((tag: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={selectedIds.length === 0}>
                        Add Selected ({selectedIds.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
