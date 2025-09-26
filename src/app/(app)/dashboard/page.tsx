'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowUpRight, FileText, FolderOpen, ShieldCheck, CheckCircle } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { dashboardStats, activityChartData, mockAuditLogs } from '@/lib/data';
import { formatDistanceToNow } from 'date-fns';

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

const StatCard = ({ title, value, change, icon: Icon }: { title: string; value: string | number; change: number, icon: React.ElementType }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
            {change >= 0 ? '+' : ''}{change}% from last month
          </span>
        </p>
      </CardContent>
    </Card>
);


export default function DashboardPage() {
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Reports Generated" value={dashboardStats.reportsGenerated.value} change={dashboardStats.reportsGenerated.change} icon={FileText} />
        <StatCard title="Evidence Uploaded" value={dashboardStats.evidenceUploaded.value} change={dashboardStats.evidenceUploaded.change} icon={FolderOpen} />
        <StatCard title="Active Audits" value={dashboardStats.activeAudits.value} change={dashboardStats.activeAudits.change} icon={ShieldCheck} />
        <StatCard title="Findings Resolved" value={dashboardStats.findingsResolved.value} change={dashboardStats.findingsResolved.change} icon={CheckCircle} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className='font-headline'>Recent Activity</CardTitle>
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
                    <Bar dataKey="reports" fill="var(--color-reports)" radius={4} />
                    <Bar dataKey="evidence" fill="var(--color-evidence)" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='font-headline'>Recent Audit Logs</CardTitle>
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
                          <AvatarImage src={log.user.avatarUrl} alt={log.user.name} />
                          <AvatarFallback>{getInitials(log.user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{log.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action.includes('Generated') ? 'default' : 'secondary'}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
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
