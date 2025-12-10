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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface ProjectSummary {
    id: string;
    name: string;
    status: string;
    dueDate: string | null;
}

interface Customer {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    status: string;
    projects: ProjectSummary[];
}

export function CustomerAssignmentList() {
    const { token } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
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
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, [token]);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return <div>Loading customers...</div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Assigned Customers</CardTitle>
                <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search customers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active Projects</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCustomers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={customer.avatarUrl || undefined} />
                                            <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">{customer.name}</div>
                                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'}>
                                            {customer.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {customer.projects.map(p => (
                                                <Link key={p.id} href={`/dashboard/project/${p.id}`} className="block">
                                                    <div className="flex items-center gap-2 text-sm hover:underline cursor-pointer">
                                                        <span className="truncate max-w-[150px]">{p.name}</span>
                                                        <Badge variant="outline" className="text-xs">{p.status}</Badge>
                                                    </div>
                                                </Link>
                                            ))}
                                            {customer.projects.length === 0 && (
                                                <span className="text-muted-foreground text-sm">No active projects</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm">
                                            View Details <ExternalLink className="ml-2 h-3 w-3" />
                                        </Button>
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
