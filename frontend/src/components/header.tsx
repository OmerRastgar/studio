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
import { LogOut, Settings, User as UserIcon, Bell, CheckCheck, HelpCircle, Briefcase, Calendar, MessageSquare, Menu, Plus, Search, FileText } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

        // const [notifications, setNotifications] = useState<any[]>([]); // Removed

        // useEffect(() => { // Removed
        //   async function fetchNotifications() {
        //     if (!token) return;

        //     if (!user || !['auditor', 'manager', 'reviewer'].includes(user.role)) return;

        //     try {
        //       const [requestsRes, eventsRes, customersRes] = await Promise.all([
        //         fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/requests`, { headers: { Authorization: `Bearer ${token}` } }),
        //         fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/events`, { headers: { Authorization: `Bearer ${token}` } }),
        //         fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auditor/customers`, { headers: { Authorization: `Bearer ${token}` } })
        //       ]);

        //       let fetchedNotifications: any[] = [];

        //       // Process Audit Requests (Work)
        //       if (requestsRes.ok) {
        //         const reqData = await requestsRes.json();
        //         if (reqData.success && Array.isArray(reqData.data)) {
        //           const pendingRequests = reqData.data.filter((r: any) => r.status === 'Pending').map((r: any) => ({
        //             id: `req-${r.id}`,
        //             title: "Audit Request",
        //             description: `${r.projectId ? 'Project: ' + r.project?.name : 'General'}: ${r.title}`,
        //             time: "Pending", // Could calculate relative time
        //             type: "request"
        //           }));
        //           fetchedNotifications = [...fetchedNotifications, ...pendingRequests];
        //         }
        //       }

        //       // Process Events (Deadlines)
        //       if (eventsRes.ok) {
        //         const evtData = await eventsRes.json();
        //         if (evtData.success && Array.isArray(evtData.data)) {
        //           const dueEvents = evtData.data.filter((e: any) => e.title.includes('Due')).map((e: any) => ({
        //             id: `evt-${e.id}`,
        //             title: "Project Deadline",
        //             description: `${e.title} is approaching.`,
        //             time: new Date(e.startTime).toLocaleDateString(),
        //             type: "event"
        //           }));
        //           fetchedNotifications = [...fetchedNotifications, ...dueEvents];
        //         }
        //       }

        //       // Process Projects for Review Status (via Customers endpoint)
        //       if (customersRes.ok) {
        //         const custData = await customersRes.json();
        //         if (custData.success && Array.isArray(custData.data)) {
        //           const projects = custData.data.flatMap((c: any) => c.projects || []);

        //           // Approved Projects
        //           const approvedProjs = projects.filter((p: any) => p.status === 'approved').map((p: any) => ({
        //             id: `proj-app-${p.id}`,
        //             title: "Report Approved",
        //             description: `The report for '${p.name}' has been approved.`,
        //             time: "Recent",
        //             type: "review-approved"
        //           }));

        //           // Returned Projects
        //           const returnedProjs = projects.filter((p: any) => p.status === 'returned').map((p: any) => ({
        //             id: `proj-ret-${p.id}`,
        //             title: "Report Returned",
        //             description: `The report for '${p.name}' was sent back for improvements.`,
        //             time: "Action Required",
        //             type: "review-returned"
        //           }));

        //           fetchedNotifications = [...fetchedNotifications, ...approvedProjs, ...returnedProjs];
        //         }
        //       }

        //       // Merge with mocks (Messages only)
        //       setNotifications([...mockMessages, ...fetchedNotifications]);

        //     } catch (error) {
        //       console.error("Failed to fetch notifications:", error);
        //       // Fallback to mocks if API fails
        //       setNotifications(mockMessages);
        //     }
        //   }

        //   fetchNotifications();
        // }, [token]);

        // const getIcon = (type: string) => { // Removed
        //   switch (type) {
        //     case 'request': return <Briefcase className="h-4 w-4 text-orange-500" />;
        //     case 'event': return <Calendar className="h-4 w-4 text-red-500" />;
        //     case 'review': return <CheckCheck className="h-4 w-4 text-green-500" />;
        //     case 'message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
        //     default: return <Bell className="h-4 w-4" />;
        //   }
        // };

        // Use real notifications
        const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

        const handleNotificationClick = async (n: any) => {
          if (!n.read) {
            await markAsRead(n.id);
          }
        };

        // Dummy crumbs for demonstration, as the original HeaderProps doesn't include them
        const crumbs = pageTitle.split('/').filter(Boolean);

        return (
          <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b bg-background px-6 shadow-sm transition-all duration-300 ease-in-out">
            <SidebarTrigger />
            <div className="flex flex-1 items-center gap-4">
              <Breadcrumb>
                <BreadcrumbList>
                  {crumbs.map((crumb, index) => {
                    const isLast = index === crumbs.length - 1;
                    const path = `/${crumbs.slice(0, index + 1).join('/')}`;

                    // Format crumb label
                    let label = crumb.charAt(0).toUpperCase() + crumb.slice(1);

                    // Handle UUIDs or long strings
                    if (crumb.length > 20 || /^[0-9a-f]{8}-/.test(crumb)) {
                      label = 'Details';
                    }

                    return (
                      <BreadcrumbItem key={path}>
                        {!isLast ? (
                          <>
                            <BreadcrumbLink asChild>
                              <Link href={path}>{label}</Link>
                            </BreadcrumbLink>
                            <BreadcrumbSeparator />
                          </>
                        ) : (
                          <BreadcrumbPage>{label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative transition-transform active:scale-95">
                    <Bell className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in zoom-in duration-300">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-lg border-opacity-50 backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => markAllAsRead()}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="flex flex-col p-1">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground text-sm opacity-80">
                          <Bell className="mb-2 h-8 w-8 opacity-20" />
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={cn(
                              "group flex items-start gap-4 rounded-md p-3 transition-all hover:bg-accent cursor-pointer border-b border-border/40 last:border-0",
                              !n.read ? "bg-primary/5 hover:bg-primary/10" : ""
                            )}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <div className="mt-1 rounded-full bg-background p-1.5 shadow-sm ring-1 ring-border group-hover:ring-primary/20 transition-all">
                              {n.type.includes('message') ? (
                                <MessageSquare className="h-4 w-4 text-primary" />
                              ) : n.type.includes('request') ? (
                                <FileText className="h-4 w-4 text-orange-500" />
                              ) : (
                                <Bell className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className={cn("text-sm font-medium leading-none group-hover:text-primary transition-colors", !n.read && "text-primary")}>
                                  {n.title}
                                </p>
                                <span className="text-[10px] text-muted-foreground/70">
                                  {new Date(n.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {n.message}
                              </p>
                              {n.link && (
                                <Link
                                  href={n.link}
                                  className="mt-2 inline-flex items-center text-[10px] font-medium text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Details
                                </Link>
                              )}
                            </div>
                            {!n.read && (
                              <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-primary/20 animate-pulse" />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <ThemeToggle />

              {user && (
                <DropdownMenu>
                  {/* User Menu remains same */}
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-border hover:ring-primary/50 transition-all">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        <Badge variant="outline" className="mt-1 w-fit text-[10px] capitalize">
                          {user.role}
                        </Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
                      onClick={() => logout()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
        );
      }
