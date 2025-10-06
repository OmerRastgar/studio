
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockCustomerCourses } from '@/lib/data';
import { Search, FileDown, Trophy, BookCheck } from 'lucide-react';
import type { CustomerCourse, Course } from '@/lib/types';
import Image from 'next/image';
import { format } from 'date-fns';

const CourseStatusBadge = ({ status }: { status: Course['status'] }) => {
    const variant = {
      'Completed': 'default',
      'In Progress': 'secondary',
      'Not Started': 'outline',
    }[status] as 'default' | 'secondary' | 'outline';
  
    return <Badge variant={variant}>{status}</Badge>;
};

export default function CustomerLearningView() {
  const allCourses = mockCustomerCourses;
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
        const term = searchTerm.toLowerCase();
        const statusMatch = statusFilter === 'all' || course.status === statusFilter;
        const searchMatch = course.title.toLowerCase().includes(term) || course.description.toLowerCase().includes(term);
        return statusMatch && searchMatch;
    });
  }, [allCourses, searchTerm, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <BookCheck /> Compliance Awareness Training
        </CardTitle>
        <CardDescription>
          Complete these required training modules to ensure your organization stays compliant.
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search trainings..."
                    className="pl-8 sm:w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
            </Select>
            <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export History
            </Button>
        </div>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Training Module</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Completed On</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCourses.map(course => (
                        <TableRow key={course.id}>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                     <Image
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        width={120}
                                        height={68}
                                        className="rounded-md object-cover aspect-video"
                                        data-ai-hint="training video"
                                    />
                                    <div>
                                        <div className="font-medium">{course.title}</div>
                                        <div className="text-sm text-muted-foreground">{course.description}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <CourseStatusBadge status={course.status} />
                            </TableCell>
                             <TableCell className="text-muted-foreground">
                                {course.duration}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {course.completionDate ? format(new Date(course.completionDate), 'PPP') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                                {course.status === 'Completed' ? (
                                    <Button variant="outline" size="sm" disabled>
                                        <Trophy className="mr-2 h-4 w-4" />
                                        Completed
                                    </Button>
                                ) : (
                                    <Button size="sm">
                                        {course.status === 'In Progress' ? 'Continue' : 'Start Training'}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredCourses.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No trainings found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};
