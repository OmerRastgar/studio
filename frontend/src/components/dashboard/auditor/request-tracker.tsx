"use client";

import { useAuth } from "@/app/auth-provider";
import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuditRequest {
    id: string;
    title: string;
    description: string | null;
    status: 'Pending' | 'Resolved' | 'Escalated';
    dueDate: string | null;
    createdAt: string;
    customer: {
        name: string;
        avatarUrl: string | null;
    };
    project: {
        name: string;
    } | null;
}

interface Project {
    id: string;
    name: string;
}

interface Control {
    id: string;
    control: string;
}

interface Customer {
    id: string;
    name: string;
    projects: Project[];
}

export function RequestTracker() {
    const { token } = useAuth();
    const [requests, setRequests] = useState<AuditRequest[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [availableControls, setAvailableControls] = useState<Control[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // New Request State
    const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
    const [newRequest, setNewRequest] = useState({
        customerId: "",
        projectId: "",
        controlId: "",
        title: "",
        description: "",
        dueDate: ""
    });

    const selectedCustomerProjects = customers.find(c => c.id === newRequest.customerId)?.projects || [];

    const fetchControls = async (projectId: string) => {
        if (!token || !projectId) {
            setAvailableControls([]);
            return;
        }
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            const res = await fetch(`${apiUrl}/api/auditor/projects/${projectId}/assessment`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Map the assessment/control data to simple controls list
                setAvailableControls(data.data.controls.map((c: any) => ({
                    id: c.id,
                    control: c.title || 'Untitled Control'
                })));
            }
        } catch (error) {
            console.error('Failed to fetch controls:', error);
            setAvailableControls([]);
        }
    };

    // When project changes, fetch controls
    useEffect(() => {
        if (newRequest.projectId) {
            fetchControls(newRequest.projectId);
        } else {
            setAvailableControls([]);
        }
    }, [newRequest.projectId, token]);

    const fetchRequests = async () => {
        if (!token) return;
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            const res = await fetch(`${apiUrl}/api/auditor/requests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        if (!token) return;
        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            const res = await fetch(`${apiUrl}/api/auditor/customers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchCustomers();
    }, [token]);

    const handleCreateRequest = async () => {
        if (!token || !newRequest.customerId || !newRequest.title) return;

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            // Remove empty strings for optional fields
            const payload: any = { ...newRequest };
            if (!payload.projectId) delete payload.projectId;
            if (!payload.controlId) delete payload.controlId;
            if (!payload.dueDate) delete payload.dueDate;

            const res = await fetch(`${apiUrl}/api/auditor/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsNewRequestOpen(false);
                setNewRequest({ customerId: "", projectId: "", controlId: "", title: "", description: "", dueDate: "" });
                fetchRequests();
            }
        } catch (error) {
            console.error('Failed to create request:', error);
        }
    };

    // ... (handleStatusUpdate, filteredRequests logic remains largely same, just updating UI below)

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!token) return;

        try {
            const apiBase = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') : '';
            const apiUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

            const res = await fetch(`${apiUrl}/api/auditor/requests/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                fetchRequests();
            }
        } catch (error) {
            console.error('Failed to update request:', error);
        }
    };

    const filteredRequests = requests.filter(r => {
        const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.customer.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <div>Loading requests...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Audit Requests</CardTitle>
                <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm">
                            <Plus className="mr-2 h-4 w-4" /> New Request
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Audit Request</DialogTitle>
                            <DialogDescription>
                                Send a new request to a customer for information or action.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Customer Select */}
                            <div className="grid gap-2">
                                <Label htmlFor="customer">Customer *</Label>
                                <Select
                                    value={newRequest.customerId}
                                    onValueChange={(val) => setNewRequest({ ...newRequest, customerId: val, projectId: "", controlId: "" })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Project Select (Optional) - depends on Customer */}
                            <div className="grid gap-2">
                                <Label htmlFor="project">Project (Optional)</Label>
                                <Select
                                    value={newRequest.projectId}
                                    onValueChange={(val) => setNewRequest({ ...newRequest, projectId: val, controlId: "" })}
                                    disabled={!newRequest.customerId || selectedCustomerProjects.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedCustomerProjects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Control Select (Optional) - depends on Project */}
                            <div className="grid gap-2">
                                <Label htmlFor="control">Control (Optional)</Label>
                                <Select
                                    value={newRequest.controlId}
                                    onValueChange={(val) => setNewRequest({ ...newRequest, controlId: val })}
                                    disabled={!newRequest.projectId || availableControls.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select control" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableControls.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.control.substring(0, 50)}...</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={newRequest.title}
                                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                                    placeholder="Request title"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={newRequest.description}
                                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                                    placeholder="Detailed description of the request"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={newRequest.dueDate}
                                    onChange={(e) => setNewRequest({ ...newRequest, dueDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateRequest}>Create Request</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Resolved">Resolved</SelectItem>
                            <SelectItem value="Escalated">Escalated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No requests found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell className="font-medium">{request.title}</TableCell>
                                    <TableCell>{request.customer.name}</TableCell>
                                    <TableCell>{request.project?.name || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            request.status === 'Resolved' ? 'default' :
                                                request.status === 'Escalated' ? 'destructive' : 'secondary'
                                        }>
                                            {request.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={request.status}
                                            onValueChange={(val) => handleStatusUpdate(request.id, val)}
                                        >
                                            <SelectTrigger className="w-[110px] h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Pending">Pending</SelectItem>
                                                <SelectItem value="Resolved">Resolved</SelectItem>
                                                <SelectItem value="Escalated">Escalated</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
