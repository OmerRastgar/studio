"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/app/auth-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    Upload,
    X,
    Link as LinkIcon,
    File,
    FileImage,
    FileAudio,
    FileText,
    FileSpreadsheet,
    FileCode
} from "lucide-react";

interface Control {
    id: string;
    control: { code: string; title: string };
    tags?: string[] | any[]; // Tags from the control (can be string[] or Tag objects)
}

interface EvidenceUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    controlId?: string;
    controlCode?: string;
    controlTags?: string[] | any[]; // Tags from the pre-selected control
    controls?: Control[];
    onSuccess: () => void;
}

interface UploadedFile {
    file: File;
    preview?: string;
}

const ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp',
    '.mp3', '.wav', '.ogg', '.m4a',
    '.json', '.xml', '.yaml', '.yml', '.log', '.config', '.ini'
];

function getFileIcon(type: string) {
    if (type.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (type.startsWith('audio/')) return <FileAudio className="w-5 h-5 text-purple-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (type.includes('json') || type.includes('xml') || type.includes('yaml'))
        return <FileCode className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEFAULT_CONTROLS: Control[] = [];

export function EvidenceUploadDialog({
    open,
    onOpenChange,
    projectId,
    controlId,
    controlCode,
    controlTags,
    controls = DEFAULT_CONTROLS,
    onSuccess,
}: EvidenceUploadDialogProps) {
    const { token } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<"upload" | "link">("upload");

    // Link mode state
    const [fileName, setFileName] = useState("");
    const [fileUrl, setFileUrl] = useState("");

    // Upload mode state
    const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Common state
    const [selectedControls, setSelectedControls] = useState<string[]>(controlId ? [controlId] : []);
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';

    // Use a ref to track if we have initialized tags for this open session
    const tagsInitializedRef = useRef(false);

    // Reset initialization state when dialog closes or control changes
    useEffect(() => {
        if (!open) {
            setTags(prev => prev.length ? [] : prev);
            setSelectedControls(prev => (controlId && prev.length === 1 && prev[0] === controlId) ? prev : (controlId ? [controlId] : []));
            tagsInitializedRef.current = false;
        }
    }, [open, controlId]);

    // Auto-populate tags when dialog opens with a pre-selected control
    // RUNS ONLY ONCE PER OPEN SESSION due to tagsInitializedRef check
    useEffect(() => {
        if (open && controlId && !tagsInitializedRef.current) {
            let extractedTags: string[] = [];

            console.log('[DEBUG] Dialog Open - Initializing Tags (Once)', { open, controlId, controlTags, controlsLength: controls.length });

            // First try using controlTags prop (fastest)
            if (controlTags && controlTags.length > 0) {
                extractedTags = Array.isArray(controlTags)
                    ? controlTags.map((t: any) => typeof t === 'string' ? t : (t.name || t))
                    : [];
            }
            // Fallback: try finding in controls array
            else if (controls.length > 0) {
                const control = controls.find(c => c.id === controlId);
                if (control && control.tags && control.tags.length > 0) {
                    extractedTags = Array.isArray(control.tags)
                        ? control.tags.map((t: any) => typeof t === 'string' ? t : (t.name || t))
                        : [];
                }
            }

            // Clean and Sort
            const finalTags = extractedTags.filter(t => t).sort();

            console.log('[DEBUG] Calculated Tags', { finalTags });

            if (finalTags.length > 0) {
                setTags(finalTags);
            }

            // Mark as initialized so we don't run this again even if props change
            tagsInitializedRef.current = true;
        }
    }, [open, controlId, controlTags, controls]);

    // File handling
    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;

        const newFiles: UploadedFile[] = [];
        const maxSize = 10 * 1024 * 1024; // 10MB

        Array.from(files).forEach(file => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();

            if (!ALLOWED_EXTENSIONS.includes(ext)) {
                setError(`File type not allowed: ${file.name}`);
                return;
            }

            if (file.size > maxSize) {
                setError(`File too large: ${file.name} (max 10MB)`);
                return;
            }

            const uploadedFile: UploadedFile = { file };

            // Create preview for images
            if (file.type.startsWith('image/')) {
                uploadedFile.preview = URL.createObjectURL(file);
            }

            newFiles.push(uploadedFile);
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
        setError(null);
    }, []);

    const removeFile = (index: number) => {
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            if (newFiles[index].preview) {
                URL.revokeObjectURL(newFiles[index].preview!);
            }
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    // Tag handling
    const handleAddTag = () => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((t) => t !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddTag();
        }
    };

    const toggleControl = async (cId: string) => {
        const isAdding = !selectedControls.includes(cId);

        setSelectedControls(prev =>
            prev.includes(cId) ? prev.filter(id => id !== cId) : [...prev, cId]
        );

        // When adding a control, fetch its tags and add them
        if (isAdding) {
            try {
                // Find the control in the controls array to get its tags
                const control = controls.find(c => c.id === cId);
                if (control && (control as any).tags) {
                    const controlTags = (control as any).tags;
                    // Add control tags to existing tags (avoid duplicates)
                    setTags(prevTags => {
                        const newTags = Array.isArray(controlTags)
                            ? controlTags.map((t: any) => typeof t === 'string' ? t : t.name)
                            : [];
                        const uniqueTags = [...new Set([...prevTags, ...newTags])];
                        return uniqueTags;
                    });
                }
            } catch (err) {
                console.error('Error loading control tags:', err);
            }
        }
    };

    // Submit handlers
    const handleUploadSubmit = async () => {
        if (selectedFiles.length === 0) {
            setError("Please select at least one file");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // First upload files to MinIO
            const formData = new FormData();
            formData.append('projectId', projectId);
            selectedFiles.forEach(f => formData.append('files', f.file));

            const uploadRes = await fetch(`${apiBase}/api/uploads`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (!uploadRes.ok) {
                const uploadData = await uploadRes.json();
                throw new Error(uploadData.error || 'Failed to upload files');
            }

            const uploadData = await uploadRes.json();

            // Now create evidence records for each uploaded file
            for (const uploadedFile of uploadData.files) {
                await fetch(`${apiBase}/api/evidence`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        projectId,
                        controlIds: selectedControls,
                        fileName: uploadedFile.fileName,
                        fileUrl: uploadedFile.fileUrl,
                        tags,
                        type: uploadedFile.type
                    })
                });
            }

            // Clean up and close
            selectedFiles.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
            resetForm();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleLinkSubmit = async () => {
        if (!fileName.trim() || !fileUrl.trim()) {
            setError("Please fill in all required fields");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${apiBase}/api/evidence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    projectId,
                    controlIds: selectedControls,
                    fileName: fileName.trim(),
                    fileUrl: fileUrl.trim(),
                    tags,
                    type: 'document'
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add evidence");
            }

            resetForm();
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add evidence");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFileName("");
        setFileUrl("");
        setSelectedFiles([]);
        setSelectedControls(controlId ? [controlId] : []);
        setTags([]);
        setTagInput("");
        setError(null);
        onOpenChange(false);
    };

    const handleClose = () => {
        if (!loading) {
            selectedFiles.forEach(f => {
                if (f.preview) URL.revokeObjectURL(f.preview);
            });
            resetForm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Upload Evidence</DialogTitle>
                    <DialogDescription>
                        {controlCode
                            ? <>Add evidence for control <span className="font-mono">{controlCode}</span></>
                            : <>Add evidence to this project</>
                        }
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "link")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload" className="gap-2">
                            <Upload className="w-4 h-4" /> Upload Files
                        </TabsTrigger>
                        <TabsTrigger value="link" className="gap-2">
                            <LinkIcon className="w-4 h-4" /> Link URL
                        </TabsTrigger>
                    </TabsList>

                    {/* Upload Files Tab */}
                    <TabsContent value="upload" className="space-y-4 mt-4">
                        {/* Drop Zone */}
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragging
                                ? 'border-primary bg-primary/5'
                                : 'border-muted-foreground/25 hover:border-primary/50'
                                }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Drag & drop files here, or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Max 10MB per file • PDF, DOC, XLS, Images, Audio, Logs
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                accept={ALLOWED_EXTENSIONS.join(',')}
                                onChange={(e) => handleFiles(e.target.files)}
                            />
                        </div>

                        {/* Selected Files */}
                        {selectedFiles.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedFiles.map((f, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                        {f.preview ? (
                                            <img src={f.preview} className="w-8 h-8 object-cover rounded" alt="" />
                                        ) : (
                                            getFileIcon(f.file.type)
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{f.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(f.file.size)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => removeFile(idx)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Link URL Tab */}
                    <TabsContent value="link" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="fileName">File Name *</Label>
                            <Input
                                id="fileName"
                                placeholder="e.g., Security Policy v2.1.pdf"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fileUrl">File URL *</Label>
                            <Input
                                id="fileUrl"
                                placeholder="https://example.com/documents/policy.pdf"
                                value={fileUrl}
                                onChange={(e) => setFileUrl(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the URL where the evidence file is hosted
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Shared Controls Selection */}
                {controls.length > 0 && (
                    <div className="space-y-2">
                        <Label>Link to Controls (Optional)</Label>
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                            {controls.map(c => (
                                <div key={c.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`control-${c.id}`}
                                        checked={selectedControls.includes(c.id)}
                                        onCheckedChange={() => toggleControl(c.id)}
                                    />
                                    <Label
                                        htmlFor={`control-${c.id}`}
                                        className="text-sm font-normal cursor-pointer"
                                    >
                                        <span className="font-medium text-primary">{c.control.code}</span> - {c.control.title}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            You can select multiple controls to link this evidence to.
                        </p>
                    </div>
                )}


                {/* Tags (shown for both tabs) */}
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (optional)</Label>
                    <div className="flex gap-2">
                        <Input
                            id="tags"
                            placeholder="Add a tag and press Enter"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleAddTag}
                            disabled={loading || !tagInput.trim()}
                        >
                            Add
                        </Button>
                    </div>
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1">
                                    {tag}
                                    <X
                                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                                        onClick={() => handleRemoveTag(tag)}
                                    />
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={activeTab === "upload" ? handleUploadSubmit : handleLinkSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {activeTab === "upload" ? "Uploading..." : "Adding..."}
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                {activeTab === "upload"
                                    ? `Upload ${selectedFiles.length || ''} File${selectedFiles.length !== 1 ? 's' : ''}`
                                    : "Add Evidence"
                                }
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
