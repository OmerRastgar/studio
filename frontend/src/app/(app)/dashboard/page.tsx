'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth/kratos-auth-provider';
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
  FileText,
  FolderOpen,
  ShieldCheck,
  CheckCircle,
  Search,
  Check,
  Clock,
  X,
  HelpCircle,
  Bell,
  Users,
  TrendingUp,
  LayoutDashboard,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from 'recharts';
// import { dashboardStats, activityChartData, mockAuditLogs, mockAuditors, complianceProgress } from '@/lib/data-build';

// import { dashboardStats, activityChartData, mockAuditLogs, mockAuditors, complianceProgress } from '@/lib/data-build';

const dashboardStats = {
  reportsGenerated: { title: 'Total Projects', value: '0', change: 0, icon: LayoutDashboard },
  evidenceUploaded: { title: 'Active Audits', value: '0', change: 0, icon: FileText },
  activeAudits: { title: 'Issues Found', value: '0', change: 0, icon: AlertCircle },
  findingsResolved: { title: 'Compliance Score', value: '0%', change: 0, icon: CheckCircle2 },
};

const activityChartData: any[] = [];
const mockAuditLogs: any[] = [];
const mockAuditors: any[] = [];

const complianceProgress = {
  overall: 0,
  acceptedEvidence: 0,
  totalEvidence: 0,
  categories: [] as any[],
  recentActivity: [] as any[]
};
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useGuide } from '@/components/guide';
import { dashboardTourSteps } from '@/lib/guide-steps';
import { useState, useEffect } from 'react';
import { CustomerDashboardView } from '@/components/dashboard/customer-dashboard';
import { AuditorDashboardView } from '@/components/dashboard/auditor-dashboard';
import { ComplianceDashboardView } from '@/components/dashboard/compliance-dashboard';


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
  tourId,
}: {
  title: string;
  value: string | number;
  change: number;
  icon: React.ElementType;
  tourId?: string;
}) => (
  <Card data-tour-id={tourId}>
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

const TimeAgo = ({ date }: { date: string }) => {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    setTimeAgo(formatDistanceToNow(new Date(date), { addSuffix: true }));
  }, [date]);

  return <>{timeAgo}</>;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { startTour } = useGuide();

  console.log("[DashboardPage] Component rendering, user:", { id: user?.id, role: user?.role, hasUser: !!user });
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

  // Role-based permission checks based on specification
  const isAdmin = user?.role === 'admin';
  const isAuditor = user?.role === 'auditor';
  const isCustomer = user?.role === 'customer';
  const isManager = user?.role === 'manager';
  const isReviewer = user?.role === 'reviewer';

  // Dashboard section permissions
  const canViewProjectOverview = true; // All roles can view (with different scopes)
  const canManageProjects = isAdmin || isManager;
  const canViewEvidenceSummary = true; // All roles (with different permissions)
  const canManageEvidence = isAdmin || isAuditor || isManager;
  const canViewComplianceProgress = true; // All roles can view
  const canUpdateCompliance = isAdmin || isManager;
  const canViewNotifications = true; // All roles (own notifications)
  const canViewTimeTracking = isAdmin || isManager || isReviewer;
  const canViewReportStatus = true; // All roles (with different scopes)
  const canManageReports = isAdmin || isAuditor || isManager;
  const canViewLearningProgress = true; // All roles (own progress)
  const canViewUserMetrics = isAdmin || isManager || (isReviewer && 'team');
  const canViewAuditLogs = isAdmin || isManager;
  const canViewAuditorOverview = isAdmin || isManager;

  // Customize stats based on role
  const getFilteredStats = () => {
    const baseStats = {
      reportsGenerated: { ...dashboardStats.reportsGenerated },
      evidenceUploaded: { ...dashboardStats.evidenceUploaded },
      activeAudits: { ...dashboardStats.activeAudits },
      findingsResolved: { ...dashboardStats.findingsResolved }
    };

    if (isCustomer) {
      // Customer sees limited stats - only their projects
      return {
        reportsGenerated: { ...baseStats.reportsGenerated, title: "My Reports" },
        evidenceUploaded: { ...baseStats.evidenceUploaded, title: "My Evidence" },
        activeAudits: { ...baseStats.activeAudits, title: "My Audits" },
        findingsResolved: { ...baseStats.findingsResolved, title: "Resolved Items" }
      };
    } else if (isAuditor) {
      // Auditor sees assigned project stats
      return {
        reportsGenerated: { ...baseStats.reportsGenerated, title: "Reports Generated" },
        evidenceUploaded: { ...baseStats.evidenceUploaded, title: "Evidence Uploaded" },
        activeAudits: { ...baseStats.activeAudits, title: "Assigned Audits" },
        findingsResolved: { ...baseStats.findingsResolved, title: "Findings Resolved" }
      };
    }
    // Admin, Manager, Reviewer see full stats with default titles
    return {
      reportsGenerated: { ...baseStats.reportsGenerated, title: "Reports Generated" },
      evidenceUploaded: { ...baseStats.evidenceUploaded, title: "Evidence Uploaded" },
      activeAudits: { ...baseStats.activeAudits, title: "Active Audits" },
      findingsResolved: { ...baseStats.findingsResolved, title: "Findings Resolved" }
    };
  };

  const filteredStats = getFilteredStats();

  // Show loading if user data isn't available yet
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect admin and manager users to their respective dashboards using useEffect
  useEffect(() => {
    if (isAdmin && !window.location.pathname.startsWith('/dashboard/admin')) {
      console.log("[DashboardPage] Redirecting admin to /dashboard/admin");
      router.push('/dashboard/admin');
    } else if (isManager && !window.location.pathname.startsWith('/dashboard/manager')) {
      console.log("[DashboardPage] Redirecting manager to /dashboard/manager");
      router.push('/dashboard/manager');
    }
  }, [isAdmin, isManager, router]);

  // Show loading state while redirect is happening
  if ((isAdmin && !window.location.pathname.startsWith('/dashboard/admin')) ||
    (isManager && !window.location.pathname.startsWith('/dashboard/manager'))) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4">Redirecting to {isAdmin ? 'Admin' : 'Manager'} Dashboard...</p>
      </div>
    );
  }

  // Render auditor dashboard
  if (isAuditor) {
    // Audit dashboard is a component, not a redirect in the current code structure,
    // but lines 263-265 just return <AuditorDashboardView />. 
    // If we wanted to redirect to /dashboard/auditor/projects we could, but let's stick to the existing logic 
    // unless the file structure implies a separate page.
    // The previous code simply returned the component:
    return <AuditorDashboardView />;
  }

  // Render customer-specific dashboard for customer role
  if (isCustomer) {
    return <CustomerDashboardView />;
  }

  // Render compliance dashboard
  if (user?.role === 'compliance') {
    return <ComplianceDashboardView />;
  }

  return (
    <div className="grid gap-6">
      {/* Project Overview Stats - All roles can view with different scopes */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-tour-id="stat-cards">
        <StatCard
          title={filteredStats.reportsGenerated.title}
          value={filteredStats.reportsGenerated.value}
          change={filteredStats.reportsGenerated.change}
          icon={FileText}
        />
        <StatCard
          title={filteredStats.evidenceUploaded.title}
          value={filteredStats.evidenceUploaded.value}
          change={filteredStats.evidenceUploaded.change}
          icon={FolderOpen}
        />
        <StatCard
          title={filteredStats.activeAudits.title}
          value={filteredStats.activeAudits.value}
          change={filteredStats.activeAudits.change}
          icon={ShieldCheck}
        />
        <StatCard
          title={filteredStats.findingsResolved.title}
          value={filteredStats.findingsResolved.value}
          change={filteredStats.findingsResolved.change}
          icon={CheckCircle}
        />
      </div>

      {/* Compliance Progress - All roles can view */}
      <Card data-tour-id="compliance-progress">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline">
                {isCustomer ? 'My Compliance Progress' :
                  isAuditor ? 'Assigned Projects Compliance' :
                    'Overall Compliance Progress'}
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Your project compliance status.' :
                  isAuditor ? 'Compliance status for your assigned projects.' :
                    'A high-level overview of compliance status.'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => startTour(dashboardTourSteps, 'dashboardTour')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Start Tour
            </Button>
          </div>
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
            <div className='grid gap-4' data-tour-id="progress-breakdown">
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
                        <TimeAgo date={activity.timestamp} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Auditor Overview - Only for Admin and Manager */}
      {canViewAuditorOverview && (
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
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Auditor</TableHead>
                    <TableHead className="hidden md:table-cell">Current Projects</TableHead>
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
                      <TableCell className="hidden md:table-cell">
                        {auditor.projects.map((project: any, index: number) => (
                          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{project.name}</p>
                              <p className="text-xs text-muted-foreground">{project.customerName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  project.status === 'approved' ? 'default' :
                                    project.status === 'returned' ? 'destructive' : 'outline'
                                }
                                className="capitalize text-[10px] h-5 px-1.5"
                              >
                                {project.status?.replace('_', ' ') || 'In Progress'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{project.frameworkName}</span>
                            </div>
                          </div>
                        ))}
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
                        <Button variant="outline" size="sm" disabled={!canManageProjects}>
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time Tracking Section - Admin, Manager, Reviewer only */}
      {canViewTimeTracking && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Time Tracking Overview</CardTitle>
            <CardDescription>
              {isAdmin ? 'Time tracking for all users and projects' :
                isManager ? 'Time tracking for managed projects' :
                  'Time tracking for assigned projects'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold">127h</div>
                <p className="text-sm text-muted-foreground">This Month</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">8.2h</div>
                <p className="text-sm text-muted-foreground">Daily Average</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">94%</div>
                <p className="text-sm text-muted-foreground">Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Metrics Section - Admin, Manager, and limited for Reviewer */}
      {canViewUserMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">User Metrics</CardTitle>
            <CardDescription>
              {isAdmin ? 'System-wide user performance metrics' :
                isManager ? 'Team performance metrics' :
                  'Team metrics for assigned projects'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="text-xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">89</div>
                <p className="text-xs text-muted-foreground">Projects Created</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">234</div>
                <p className="text-xs text-muted-foreground">Evidence Items</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">1.2k</div>
                <p className="text-xs text-muted-foreground">AI Prompts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Section - All roles can view own notifications */}
      {canViewNotifications && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'System-wide notifications and alerts' : 'Your personal notifications'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {isCustomer ? 'New compliance policy available' :
                      isAuditor ? 'Evidence review required for Project Alpha' :
                        'New user registration pending approval'}
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg">
                <div className="h-2 w-2 bg-muted rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm">
                    {isCustomer ? 'Training course "Data Security" completed' :
                      isAuditor ? 'Report generation completed for Project Beta' :
                        'Monthly compliance report generated'}
                  </p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg">
                <div className="h-2 w-2 bg-muted rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm">
                    {isCustomer ? 'Project audit scheduled for next week' :
                      isAuditor ? 'New evidence uploaded to Project Gamma' :
                        'System maintenance scheduled for weekend'}
                  </p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        {/* Audit Logs - Only Admin and Manager can view */}
        {canViewAuditLogs ? (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Recent Audit Logs</CardTitle>
              <CardDescription>
                System change logs and user activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
                          <TimeAgo date={log.timestamp} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Alternative content for users without audit log access */
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">
                {isCustomer ? 'My Learning Progress' : 'Personal Metrics'}
              </CardTitle>
              <CardDescription>
                {isCustomer ? 'Your course progress and policies' : 'Your personal performance metrics'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isCustomer ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Compliance Policies</span>
                      <Badge variant="secondary">3 Updated</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Training Courses</span>
                      <Badge variant="secondary">2 In Progress</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Project Tours</span>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Evidence Uploaded</span>
                      <span className="text-sm text-muted-foreground">24 this month</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Time Logged</span>
                      <span className="text-sm text-muted-foreground">42 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AI Prompts Used</span>
                      <span className="text-sm text-muted-foreground">156 prompts</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
