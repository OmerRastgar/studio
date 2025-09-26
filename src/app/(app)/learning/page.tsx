'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { mockLearningData } from '@/lib/data';
import type { ChartConfig } from '@/components/ui/chart';
import { Flag, CheckCircle, Clock, BarChart3, Target, Lightbulb, BookCopy, BookMarked, Trophy } from 'lucide-react';
import type { Course } from '@/lib/types';

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


export default function LearningPage() {
  const { performanceStats, commonErrors, learningInsights, recommendedCourses } = mockLearningData;
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
                        <BookCopy className='h-4 w-4'/>
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
            <CardTitle className="font-headline flex items-center gap-2"><BookMarked /> Recommended Courses</CardTitle>
            <CardDescription>
                Courses recommended for you based on your performance analysis.
            </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {recommendedCourses.map(course => (
                 <Card key={course.id} className="flex flex-col">
                    <CardHeader>
                        <CardTitle className='text-lg'>{course.title}</CardTitle>
                        <CardDescription>{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                       <div>
                            <div className="flex justify-between items-center mb-1">
                                <CourseStatusBadge status={course.status} />
                                {course.status === 'Completed' ? (
                                    <div className="flex items-center text-sm font-medium text-green-500">
                                        <Trophy className="mr-1 h-4 w-4" />
                                        Completed
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">{course.progress}% Complete</span>
                                )}
                            </div>
                            <Progress value={course.progress} className="h-2" />
                       </div>
                    </CardContent>
                    <div className="p-6 pt-0">
                        <Button className="w-full">
                            {course.status === 'Completed' ? 'View Certificate' : course.status === 'In Progress' ? 'Continue Course' : 'Enroll Now'}
                        </Button>
                    </div>
                </Card>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
