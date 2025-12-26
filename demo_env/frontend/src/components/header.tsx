import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { User } from '@/lib/types';
import { LogOut, Settings, User as UserIcon, Bell, CheckCheck, HelpCircle, Briefcase, Calendar, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useGuide } from './guide';
import { useAuth } from '@/components/auth/kratos-auth-provider';

interface HeaderProps {
  user: User | null;
  pageTitle: string;
  showSidebarTrigger?: boolean;
}


const mockMessages = [
  { id: 'msg-1', title: "New Message", description: "Admin: Please review the latest policy updates.", time: "10m ago", type: "message" },
  { id: 'rev-1', title: "Review Completed", description: "Reviewer approved 'Q3 Security Audit'.", time: "2h ago", type: "review" },
];

export function Header({ user, pageTitle, showSidebarTrigger = true }: HeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  const { restartTour } = useGuide();
  const { token, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    async function fetchNotifications() {
      if (!token) return;

      if (!user || !['auditor', 'manager', 'reviewer'].includes(user.role)) return;

      try {
        const [requestsRes, eventsRes, customersRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/requests`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/events`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/customers`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        let fetchedNotifications: any[] = [];

        // Process Audit Requests (Work)
        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          if (reqData.success && Array.isArray(reqData.data)) {
            const pendingRequests = reqData.data.filter((r: any) => r.status === 'Pending').map((r: any) => ({
              id: `req-${r.id}`,
              title: "Audit Request",
              description: `${r.projectId ? 'Project: ' + r.project?.name : 'General'}: ${r.title}`,
              time: "Pending", // Could calculate relative time
              type: "request"
            }));
            fetchedNotifications = [...fetchedNotifications, ...pendingRequests];
          }
        }

        // Process Events (Deadlines)
        if (eventsRes.ok) {
          const evtData = await eventsRes.json();
          if (evtData.success && Array.isArray(evtData.data)) {
            const dueEvents = evtData.data.filter((e: any) => e.title.includes('Due')).map((e: any) => ({
              id: `evt-${e.id}`,
              title: "Project Deadline",
              description: `${e.title} is approaching.`,
              time: new Date(e.startTime).toLocaleDateString(),
              type: "event"
            }));
            fetchedNotifications = [...fetchedNotifications, ...dueEvents];
          }
        }

        // Process Projects for Review Status (via Customers endpoint)
        if (customersRes.ok) {
          const custData = await customersRes.json();
          if (custData.success && Array.isArray(custData.data)) {
            const projects = custData.data.flatMap((c: any) => c.projects || []);

            // Approved Projects
            const approvedProjs = projects.filter((p: any) => p.status === 'approved').map((p: any) => ({
              id: `proj-app-${p.id}`,
              title: "Report Approved",
              description: `The report for '${p.name}' has been approved.`,
              time: "Recent",
              type: "review-approved"
            }));

            // Returned Projects
            const returnedProjs = projects.filter((p: any) => p.status === 'returned').map((p: any) => ({
              id: `proj-ret-${p.id}`,
              title: "Report Returned",
              description: `The report for '${p.name}' was sent back for improvements.`,
              time: "Action Required",
              type: "review-returned"
            }));

            fetchedNotifications = [...fetchedNotifications, ...approvedProjs, ...returnedProjs];
          }
        }

        // Merge with mocks (Messages only)
        setNotifications([...mockMessages, ...fetchedNotifications]);

      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        // Fallback to mocks if API fails
        setNotifications(mockMessages);
      }
    }

    fetchNotifications();
  }, [token]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'request': return <Briefcase className="h-4 w-4 text-orange-500" />;
      case 'event': return <Calendar className="h-4 w-4 text-red-500" />;
      case 'review': return <CheckCheck className="h-4 w-4 text-green-500" />;
      case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        {showSidebarTrigger && <SidebarTrigger />}
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl font-headline">{pageTitle}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <ThemeToggle />

        {user?.role !== 'compliance' && (
          <Button variant="ghost" className="h-10 w-10 rounded-full animate-bounce" onClick={restartTour}>
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Start Tour</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <Badge className="absolute top-2 right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                  {notifications.length}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                <Button variant="outline" size="sm" className="h-7 gap-1">
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Mark all as read</span>
                </Button>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
              {notifications.length > 0 ? notifications.map(notification => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 cursor-pointer">
                  <div className="flex items-center gap-2 w-full">
                    {getIcon(notification.type)}
                    <p className='font-medium text-sm truncate'>{notification.title}</p>
                    <span className="ml-auto text-[10px] text-muted-foreground">{notification.time}</span>
                  </div>
                  <p className='text-xs text-muted-foreground line-clamp-2 pl-6'>{notification.description}</p>
                </DropdownMenuItem>
              )) : <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm font-medium text-primary">
              <Link href="/audit-log">View all notifications</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.avatarUrl} alt={user?.name || 'User'} data-ai-hint="person avatar" />
                <AvatarFallback>{user ? getInitials(user.name) : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'Guest'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role !== 'compliance' && (
              <>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
