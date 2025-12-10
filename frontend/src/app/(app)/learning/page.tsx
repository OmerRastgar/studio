'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockLearningData, mockCustomerCourses } from '@/lib/data-build';
import type { ChartConfig } from '@/components/ui/chart';
import { Flag, CheckCircle, Clock, BarChart3, Target, Lightbulb, BookCopy, BookMarked, Trophy, BookCheck, Clock3, Search, Download, FileDown } from 'lucide-react';
import type { Course, CustomerCourse, User } from '@/lib/types';
import Image from 'next/image';
import { format } from 'date-fns';

const chartConfig = {
  count: {
    label: 'Count',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const CourseStatusBadge = ({ status }: { status: Course['status'] }) => {
  const variant = {
    'Completed': 'default',
    'In Progress': 'secondary',
    'Not Started': 'outline',
  }[status] as 'default' | 'secondary' | 'outline';

  return <Badge variant={variant}>{status}</Badge>;
};

const AuditorLearningPage = () => {
  const { performanceStats, commonErrors, learningInsights, recommendedCourses } = mockLearningData;
  const allCourses = recommendedCourses;
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
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><BarChart3 /> Auditor Performance Dashboard</CardTitle>
          <CardDescription>
            Review your performance metrics and AI-driven insights to improve your auditing skills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Issues Flagged" value={performanceStats.issuesFlagged} icon={Flag} />
            <StatCard title="Resolution Rate" value={`${performanceStats.resolutionRate}%`} icon={Target} />
            <StatCard title="Avg. Time to Resolution" value={performanceStats.avgTimeToResolution} icon={Clock} />
            <StatCard title="Overdue Flags" value={performanceStats.overdueFlags} icon={CheckCircle} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Common Error Analysis</CardTitle>
              <CardDescription>Frequency of common errors identified in your reports.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart accessibilityLayer data={commonErrors}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="error"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Lightbulb /> AI-Generated Learning Insights</CardTitle>
          <CardDescription>
            Actionable feedback from our AI to help you improve report quality and consistency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {learningInsights.map((insight, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger>
                  <div className='flex items-center gap-2'>
                    <BookCopy className='h-4 w-4' />
                    <span className='font-semibold'>{insight.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 px-2">
                  <p className="text-muted-foreground">{insight.explanation}</p>
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="font-semibold text-sm mb-2">Example:</p>
                    <blockquote className="border-l-2 pl-4 italic text-sm text-muted-foreground">
                      "{insight.example}"
                    </blockquote>
                  </div>
                  <div className="p-4 border rounded-lg bg-primary/10">
                    <p className="font-semibold text-sm mb-2 text-primary">Suggestion:</p>
                    <p className="text-sm text-primary/90">{insight.suggestion}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><BookMarked /> My Learning</CardTitle>
          <CardDescription>
            Manage your recommended courses and track your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search courses..."
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
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Completed On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map(course => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="font-medium">{course.title}</div>
                      <div className="text-sm text-muted-foreground">{course.description}</div>
                    </TableCell>
                    <TableCell>
                      <CourseStatusBadge status={course.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={course.progress} className="w-24" />
                        <span>{course.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {course.completionDate ? format(new Date(course.completionDate), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {course.status === 'Completed' ? (
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Certificate
                        </Button>
                      ) : (
                        <Button size="sm">
                          {course.status === 'In Progress' ? 'Continue' : 'Enroll'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCourses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No courses found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const CustomerLearningPage = () => {
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


export default function LearningPage() {
  // In a real app, this would come from an auth context or API call
  const currentUser: User = {
    name: 'Admin Auditor',
    email: 'admin@auditace.com',
    avatarUrl: '...',
    role: 'auditor',
  };

  if (currentUser.role === 'customer') {
    return <CustomerLearningPage />;
  }

  return <AuditorLearningPage />;
}
