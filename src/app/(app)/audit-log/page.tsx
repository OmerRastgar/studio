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
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const ITEMS_PER_PAGE = 10;

export default function AuditLogPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(mockAuditLogs.length / ITEMS_PER_PAGE);

  const paginatedLogs = mockAuditLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
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
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
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
                    {log.action}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{log.details}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
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
