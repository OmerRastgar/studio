'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpRight,
  FileText,
  FolderOpen,
  ShieldCheck,
  CheckCircle,
  Search,
  MoreVertical,
  Check,
  Clock,
  X,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from 'recharts';
import { dashboardStats, activityChartData, mockAuditLogs, mockAuditors, complianceProgress } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const chartConfig = {
  reports: {
    label: 'Reports',
    color: 'hsl(var(--primary))',
  },
  evidence: {
    label: 'Evidence',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

const progressChartConfig = {
    completed: {
      label: 'Completed',
      color: "hsl(var(--primary))",
    },
    remaining: {
      label: 'Remaining',
      color: "hsl(var(--muted))",
    },
} satisfies ChartConfig;


const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">
        <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
          {change >= 0 ? '+' : ''}
          {change}% from last month
        </span>
      </p>
    </CardContent>
  </Card>
);

const EvidenceStatusIcon = ({ status }: { status: 'Accepted' | 'Pending' | 'Rejected' }) => {
    switch (status) {
        case 'Accepted':
            return <Check className="h-4 w-4 text-green-500" />;
        case 'Pending':
            return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'Rejected':
            return <X className="h-4 w-4 text-red-500" />;
    }
};

export default function DashboardPage() {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('');
      
  const overallProgress = complianceProgress.overall;
  const progressData = [
      { name: 'completed', value: overallProgress, fill: 'hsl(var(--primary))' },
      { name: 'remaining', value: 100 - overallProgress, fill: 'hsl(var(--muted))' }
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Reports Generated"
          value={dashboardStats.reportsGenerated.value}
          change={dashboardStats.reportsGenerated.change}
          icon={FileText}
        />
        <StatCard
          title="Evidence Uploaded"
          value={dashboardStats.evidenceUploaded.value}
          change={dashboardStats.evidenceUploaded.change}
          icon={FolderOpen}
        />
        <StatCard
          title="Active Audits"
          value={dashboardStats.activeAudits.value}
          change={dashboardStats.activeAudits.change}
          icon={ShieldCheck}
        />
        <StatCard
          title="Findings Resolved"
          value={dashboardStats.findingsResolved.value}
          change={dashboardStats.findingsResolved.change}
          icon={CheckCircle}
        />
      </div>

       <Card data-tour-id="compliance-progress">
        <CardHeader>
          <CardTitle className="font-headline">Overall Compliance Progress</CardTitle>
          <CardDescription>
            A high-level overview of your compliance status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative flex flex-col items-center justify-center">
               <ChartContainer
                config={progressChartConfig}
                className="mx-auto aspect-square h-64"
                >
                <PieChart>
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                        data={progressData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={80}
                        outerRadius={100}
                        startAngle={90}
                        endAngle={450}
                        cy="50%"
                    >
                        {progressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                </PieChart>
               </ChartContainer>
                <div className="absolute flex flex-col items-center justify-center text-center">
                    <div className="text-3xl font-bold">
                        {overallProgress}%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {complianceProgress.acceptedEvidence} of {complianceProgress.totalEvidence} evidence accepted.
                    </p>
                </div>
            </div>
            <div className='grid gap-4'>
                <div>
                  <h3 className="font-semibold mb-2">Progress by Category</h3>
                  <div className="space-y-3">
                      {complianceProgress.categories.map(category => (
                          <div key={category.name}>
                              <div className="flex justify-between text-sm mb-1">
                                  <span>{category.name}</span>
                                  <span className="text-muted-foreground">{category.progress}%</span>
                              </div>
                              <Progress value={category.progress} />
                          </div>
                      ))}
                  </div>
                </div>
                 <Separator />
                <div>
                    <h3 className="font-semibold mb-2">Recent Activity</h3>
                    <ul className="space-y-3">
                        {complianceProgress.recentActivity.map(activity => (
                             <li key={activity.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <EvidenceStatusIcon status={activity.status} />
                                    <span>{activity.evidenceName}</span>
                                    <Badge variant="secondary" className="font-normal">{activity.status}</Badge>
                                </div>
                                <span className="text-muted-foreground">
                                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Auditor Overview</CardTitle>
          <CardDescription>
            Search and manage auditors across all projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search auditors by name, ID, or keyword..."
              className="pl-8 w-full"
            />
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Current Projects</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAuditors.map((auditor) => (
                  <TableRow key={auditor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={auditor.avatarUrl}
                            alt={auditor.name}
                          />
                          <AvatarFallback>
                            {getInitials(auditor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{auditor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {auditor.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {auditor.projects.join(', ')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={auditor.progress} className="w-24" />
                        <span className="text-sm text-muted-foreground">{auditor.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          auditor.status === 'Active'
                            ? 'secondary'
                            : auditor.status === 'Delayed'
                              ? 'destructive'
                              : 'outline'
                        }
                      >
                        {auditor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="outline" size="sm">Assign</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart accessibilityLayer data={activityChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="reports"
                  fill="var(--color-reports)"
                  radius={4}
                />
                <Bar
                  dataKey="evidence"
                  fill="var(--color-evidence)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAuditLogs.slice(0, 5).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={log.user.avatarUrl}
                            alt={log.user.name}
                          />
                          <AvatarFallback>
                            {getInitials(log.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{log.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.action.includes('Generated')
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
