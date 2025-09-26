'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { mockAuditLogs } from '@/lib/data';
import type { AuditLog } from '@/lib/types';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDown, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

const SeverityBadge = ({ severity }: { severity: AuditLog['severity'] }) => {
  const variant = {
    Low: 'secondary',
    Medium: 'default',
    High: 'destructive',
  }[severity] as 'secondary' | 'default' | 'destructive';
  
  return <Badge variant={variant}>{severity}</Badge>;
};

export default function AuditLogPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const actionTypes = useMemo(() => ['all', ...Array.from(new Set(mockAuditLogs.map(log => log.action)))], []);
  const severityLevels = ['all', 'Low', 'Medium', 'High'];

  const filteredLogs = useMemo(() => {
    return mockAuditLogs
      .filter(log => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          log.user.name.toLowerCase().includes(searchTermLower) ||
          log.action.toLowerCase().includes(searchTermLower) ||
          log.details.toLowerCase().includes(searchTermLower)
        );
      })
      .filter(log => actionFilter === 'all' || log.action === actionFilter)
      .filter(log => severityFilter === 'all' || log.severity === severityFilter);
  }, [searchTerm, actionFilter, severityFilter]);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Audit Log</CardTitle>
        <CardDescription>
          A chronological log of all actions performed within the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search logs..."
                    className="pl-8 sm:w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                    {actionTypes.map(action => (
                        <SelectItem key={action} value={action}>{action === 'all' ? 'All Actions' : action}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
             <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                    {severityLevels.map(level => (
                        <SelectItem key={level} value={level}>{level === 'all' ? 'All Severities' : level}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="outline" className="w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" />
                Export
            </Button>
        </div>
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="hidden md:table-cell">Details</TableHead>
                <TableHead className="text-right">Timestamp</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                        <AvatarImage src={log.user.avatarUrl} alt={log.user.name} />
                        <AvatarFallback>{getInitials(log.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid gap-0.5">
                            <p className="font-medium">{log.user.name}</p>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={log.action.includes('Generated') ? 'default' : 'secondary'}>{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                        <SeverityBadge severity={log.severity} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{log.details}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                        <time dateTime={log.timestamp}>{format(new Date(log.timestamp), 'PPpp')}</time>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
         <div className="flex items-center justify-end space-x-2 py-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
      </CardContent>
    </Card>
  );
}
