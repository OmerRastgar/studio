"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Shield,
    Plus,
    Upload,
    RefreshCw,
    ArrowLeft,
    FileSpreadsheet,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronRight,
    Trash2
} from "lucide-react";
import Link from "next/link";

interface Framework {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    _count: {
        controls: number;
        projects: number;
    };
}

interface Control {
    id: string;
    code: string;
    title: string;
    description: string | null;
    category: string | null;
    tags: string[];
}

export default function FrameworksPage() {
    const { token } = useAuth();
    const [frameworks, setFrameworks] = useState<Framework[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Expanded framework for viewing controls
    const [expandedFramework, setExpandedFramework] = useState<string | null>(null);
    const [controls, setControls] = useState<Control[]>([]);
    const [loadingControls, setLoadingControls] = useState(false);

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // CSV Import states
    const [csvData, setCsvData] = useState<any[]>([]);
    const [importResult, setImportResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchFrameworks = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/frameworks`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch frameworks");

            const data = await res.json();
            if (data.success) setFrameworks(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load frameworks");
        } finally {
            setLoading(false);
        }
    };

    const fetchControls = async (frameworkId: string) => {
        if (!token) return;

        setLoadingControls(true);
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/frameworks/${frameworkId}/controls`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to fetch controls");

            const data = await res.json();
            if (data.success) setControls(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingControls(false);
        }
    };

    useEffect(() => {
        fetchFrameworks();
    }, [token]);

    const toggleFramework = async (frameworkId: string) => {
        if (expandedFramework === frameworkId) {
            setExpandedFramework(null);
            setControls([]);
        } else {
            setExpandedFramework(frameworkId);
            await fetchControls(frameworkId);
        }
    };

    const handleCreateFramework = async () => {
        if (!formData.name) {
            setFormError("Name is required");
            return;
        }

        setFormLoading(true);
        setFormError(null);

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/frameworks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to create framework");
            }

            setShowCreateDialog(false);
            setFormData({ name: "", description: "" });
            fetchFrameworks();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to create framework");
        } finally {
            setFormLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let text = event.target?.result as string;

            // Remove BOM (Byte Order Mark) if present
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            // Normalize line endings and split
            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());

            if (lines.length < 2) {
                setFormError("CSV must have a header row and at least one data row");
                return;
            }

            // Parse headers - handle quoted values and trim
            const parseCSVLine = (line: string): string[] => {
                const result: string[] = [];
                let current = '';
                let inQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    const char = line[i];

                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim().replace(/^"|"$/g, ''));
                return result;
            };

            const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
            const requiredHeaders = ['code', 'title'];

            console.log('Detected headers:', headers); // Debug log

            if (!requiredHeaders.every(h => headers.includes(h))) {
                setFormError(`CSV must have 'code' and 'title' columns. Detected headers: ${headers.join(', ')}`);
                return;
            }

            const parsedControls = lines.slice(1).map(line => {
                const values = parseCSVLine(line);
                const control: any = {};
                headers.forEach((header, index) => {
                    control[header] = values[index] || '';
                });
                return control;
            }).filter(c => c.code && c.title);

            setCsvData(parsedControls);
            setFormError(null);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!selectedFrameworkId || csvData.length === 0) return;

        setFormLoading(true);
        setFormError(null);

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/frameworks/${selectedFrameworkId}/controls/import`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ controls: csvData }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to import controls");
            }

            setImportResult(data.data);
            fetchFrameworks();
            if (expandedFramework === selectedFrameworkId) {
                fetchControls(selectedFrameworkId);
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : "Failed to import controls");
        } finally {
            setFormLoading(false);
        }
    };

    const openImportDialog = (frameworkId: string) => {
        setSelectedFrameworkId(frameworkId);
        setCsvData([]);
        setImportResult(null);
        setFormError(null);
        setShowImportDialog(true);
    };

    const handleDeleteFramework = async (frameworkId: string, frameworkName: string) => {
        if (!confirm(`Are you sure you want to delete "${frameworkName}" and all its controls? This action cannot be undone.`)) {
            return;
        }

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || '') : '';
            const res = await fetch(`${apiBase}/api/admin/frameworks/${frameworkId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to delete framework");
            }

            // Refresh frameworks list
            fetchFrameworks();

            // Close expanded view if this one was expanded
            if (expandedFramework === frameworkId) {
                setExpandedFramework(null);
                setControls([]);
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete framework");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/admin">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Framework Management</h1>
                    <p className="text-muted-foreground">Manage compliance frameworks and controls</p>
                </div>
                <Button onClick={() => {
                    setFormData({ name: "", description: "" });
                    setFormError(null);
                    setShowCreateDialog(true);
                }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Framework
                </Button>
            </div>

            {/* Frameworks List */}
            <div className="space-y-4">
                {frameworks.map((framework) => (
                    <Card key={framework.id}>
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleFramework(framework.id)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {expandedFramework === framework.id ? (
                                        <ChevronDown className="w-5 h-5" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5" />
                                    )}
                                    <Shield className="w-5 h-5 text-primary" />
                                    <div>
                                        <CardTitle className="text-lg">{framework.name}</CardTitle>
                                        {framework.description && (
                                            <CardDescription>{framework.description}</CardDescription>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        <Badge variant="outline">
                                            {framework._count.controls} controls
                                        </Badge>
                                        <Badge variant="secondary">
                                            {framework._count.projects} projects
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openImportDialog(framework.id);
                                            }}
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Import CSV
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteFramework(framework.id, framework.name);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        {expandedFramework === framework.id && (
                            <CardContent className="border-t">
                                {loadingControls ? (
                                    <div className="py-8 text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                    </div>
                                ) : controls.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                        <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No controls yet. Import a CSV to add controls.</p>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                                        {controls.map((control) => (
                                            <div
                                                key={control.id}
                                                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                                            >
                                                <Badge variant="outline" className="font-mono shrink-0">
                                                    {control.code}
                                                </Badge>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium">{control.title}</p>
                                                    {control.description && (
                                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                                            {control.description}
                                                        </p>
                                                    )}
                                                </div>
                                                {control.category && (
                                                    <Badge variant="secondary" className="shrink-0">
                                                        {control.category}
                                                    </Badge>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Create Framework Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Framework</DialogTitle>
                        <DialogDescription>Add a new compliance framework</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., ISO 27001, HIPAA, PCI-DSS"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of the framework..."
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-destructive">{formError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateFramework} disabled={formLoading}>
                            {formLoading ? "Creating..." : "Create Framework"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Controls Dialog */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Import Controls from CSV</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file with controls. Required columns: code, title. Optional: description, category, tags
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {!importResult ? (
                            <>
                                <div className="space-y-2">
                                    <Label>CSV File</Label>
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                {csvData.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Preview ({csvData.length} controls)</Label>
                                        <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2">
                                            {csvData.slice(0, 5).map((control, index) => (
                                                <div key={index} className="flex gap-2 py-1 text-sm">
                                                    <Badge variant="outline" className="font-mono">
                                                        {control.code}
                                                    </Badge>
                                                    <span className="truncate">{control.title}</span>
                                                </div>
                                            ))}
                                            {csvData.length > 5 && (
                                                <p className="text-sm text-muted-foreground pt-2">
                                                    ... and {csvData.length - 5} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                    <p className="font-medium mb-2">CSV Format Example:</p>
                                    <code className="text-xs block bg-background p-2 rounded">
                                        code,title,description,category,tags<br />
                                        A.5.1,Information Security Policy,Establish policies...,Policy,policy;governance
                                    </code>
                                </div>

                                {formError && (
                                    <p className="text-sm text-destructive">{formError}</p>
                                )}
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                    <div>
                                        <p className="font-medium">Import Complete</p>
                                        <p className="text-sm text-muted-foreground">
                                            {importResult.imported} controls imported, {importResult.failed} failed
                                        </p>
                                    </div>
                                </div>

                                {importResult.failed > 0 && (
                                    <div className="space-y-2">
                                        <Label>Failed Items</Label>
                                        <div className="max-h-[150px] overflow-y-auto border rounded-lg p-2">
                                            {importResult.results
                                                .filter((r: any) => r.error)
                                                .map((r: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2 py-1 text-sm">
                                                        <XCircle className="w-4 h-4 text-destructive" />
                                                        <span>{r.code}: {r.error}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        {!importResult ? (
                            <>
                                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={formLoading || csvData.length === 0}
                                >
                                    {formLoading ? "Importing..." : `Import ${csvData.length} Controls`}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => {
                                setShowImportDialog(false);
                                setCsvData([]);
                                setImportResult(null);
                            }}>
                                Done
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
