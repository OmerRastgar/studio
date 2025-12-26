"use client";

import { useAuth } from "@/components/auth/kratos-auth-provider";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Settings, Trash2 } from "lucide-react";
import { AddIntegrationDialog } from "@/components/casb/AddIntegrationDialog";
import { useToast } from "@/hooks/use-toast";

interface Integration {
    id: string;
    name: string;
    type: string;
    vendor: string;
    status: string;
    lastSyncAt: string;
    findingsCount: number;
}

export default function CASBPage() {
    const { token } = useAuth();
    const { toast } = useToast();
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchIntegrations();
        }
    }, [token]);

    const fetchIntegrations = async () => {
        try {
            const res = await fetch('/api/casb/integrations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setIntegrations(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch integrations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddIntegration = async (integration: any) => {
        try {
            const res = await fetch('/api/casb/integrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(integration)
            });

            const json = await res.json();
            if (json.success) {
                setIntegrations([...integrations, json.data]);
                toast({
                    title: "Integration Added",
                    description: `${integration.name} has been connected successfully.`
                });
            } else {
                throw new Error(json.error || 'Failed to add integration');
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to add integration"
            });
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: any = {
            active: "default",
            pending: "secondary",
            failed: "destructive",
            syncing: "outline"
        };
        return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">CASB Integrations</h1>
                    <p className="text-muted-foreground mt-1">
                        Connect to SaaS applications, on-prem systems, and existing CASB vendors
                    </p>
                </div>
                <AddIntegrationDialog onAdd={handleAddIntegration} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Integrations</CardTitle>
                    <CardDescription>Manage your security data sources</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8">Loading integrations...</div>
                    ) : integrations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No integrations configured. Click "Add Integration" to get started.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Vendor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Sync</TableHead>
                                    <TableHead>Findings</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {integrations.map((integration) => (
                                    <TableRow key={integration.id}>
                                        <TableCell className="font-medium">{integration.name}</TableCell>
                                        <TableCell>{integration.type}</TableCell>
                                        <TableCell>{integration.vendor}</TableCell>
                                        <TableCell>{getStatusBadge(integration.status)}</TableCell>
                                        <TableCell>
                                            {integration.lastSyncAt
                                                ? new Date(integration.lastSyncAt).toLocaleString()
                                                : "Never"}
                                        </TableCell>
                                        <TableCell>{integration.findingsCount}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon">
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
