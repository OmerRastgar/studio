'use client';

import { useEffect } from 'react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import {
  LayoutDashboard,
  FileText,
  Database,
  ScrollText,
  Settings,
  Bot,
  BookOpen,
  Users,
  Shield,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeProvider } from '@/components/providers';
import { GuideProvider } from '@/components/guide';
import { useAuth } from '@/components/auth/kratos-auth-provider';
import { ChatProvider } from '@/components/chat/ChatProvider';
import { GlobalChatPanel, ChatButton } from '@/components/chat/GlobalChatPanel';

function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const allNavItems = [
    {
      href: '/dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      tourId: 'dashboard',
      roles: ['admin', 'auditor', 'customer', 'manager'] // All roles can see dashboard
    },
    {
      href: '/dashboard/projects', // Will be rewritten based on role
      title: 'Projects',
      icon: FileText,
      tourId: 'projects',
      roles: ['admin', 'auditor', 'manager', 'customer'] // Customer sees projects on dashboard
    },
    {
      href: '/users',
      title: 'Users',
      icon: Users,
      tourId: 'users',
      roles: ['admin', 'manager'] // Admin and manager can manage users
    },
    {
      href: '/evidence',
      title: 'Evidence',
      icon: Database,
      tourId: 'evidence',
      roles: ['admin', 'auditor', 'customer', 'manager'] // All roles can see evidence
    },
    {
      href: '/learning',
      title: 'Learning',
      icon: BookOpen,
      tourId: 'learning',
      roles: ['admin', 'auditor', 'customer', 'manager'] // All roles can access learning
    },
    {
      href: '/agents',
      title: 'Agents',
      icon: Bot,
      tourId: 'agents',
      roles: ['admin', 'auditor', 'customer', 'manager'] // All roles can see agents
    },
    {
      href: '/reports',
      title: 'Reports',
      icon: FileText,
      tourId: 'report-generation',
      roles: ['admin', 'auditor', 'manager'] // Admin, auditor, manager can see reports
    },
    {
      href: '/casb',
      title: 'CASB',
      icon: Shield,
      tourId: 'casb',
      roles: ['customer', 'auditor'] // Customer integrates their environment, auditor reviews
    },
    {
      href: '/findings',
      title: 'Findings',
      icon: AlertTriangle,
      tourId: 'findings',
      roles: ['customer', 'auditor'] // Day-to-day operational findings
    },
    {
      href: '/audit-log',
      title: 'Audit Log',
      icon: ScrollText,
      tourId: 'audit-log',
      roles: ['admin', 'auditor', 'manager'] // Admin, auditor, manager can see audit logs
    },
  ];

  // Filter navigation items based on user role and rewrite hrefs
  const navItems = allNavItems
    .filter(item => user && item.roles.includes(user.role))
    .map(item => {
      if (item.title === 'Projects') {
        if (user?.role === 'admin') return { ...item, href: '/dashboard/admin/projects' };
        if (user?.role === 'manager') return { ...item, href: '/dashboard/manager/projects' };
        if (user?.role === 'auditor') return { ...item, href: '/dashboard/auditor/projects' };
        if (user?.role === 'customer') return { ...item, href: '/dashboard/customer/projects' };
      }
      return item;
    });

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href} data-tour-id={item.tourId}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            tooltip={{ children: item.title, side: 'right', align: 'center' }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  console.log("[AppLayout] Function called:", { pathname, hasUser: !!user, loading, userRole: user?.role });

  useEffect(() => {
    console.log("[AppLayout] useEffect - Auth state changed:", { hasUser: !!user, loading, userRole: user?.role });
  }, [user, loading]);

  let pageTitle =
    pathname.split('/').pop()?.replace('-', ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
    'Dashboard';

  // Explicitly set title for Customer Dashboard
  if (user?.role === 'customer' && pathname === '/dashboard') {
    pageTitle = 'Customer Dashboard';
  }



  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If no user is authenticated (and not loading), return null (or loading state) while redirecting
  if (!user) {
    return null;
  }

  // Simplified layout for compliance users (no sidebar)
  if (user.role === 'compliance') {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <ChatProvider>
          <GuideProvider>
            <div className="min-h-screen bg-background">
              <Header user={user} pageTitle={pageTitle} showSidebarTrigger={false} />
              <main className="p-4 md:p-6" data-tour-id="main-content">
                {children}
              </main>
            </div>
          </GuideProvider>
        </ChatProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <ChatProvider>
        <GuideProvider>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader className="p-4">
                <div className="flex items-center justify-between" data-tour-id="logo">
                  <div className="text-lg font-bold font-headline group-data-[collapsible=icon]:hidden">CyberGaar</div>
                </div>
              </SidebarHeader>
              <SidebarContent>
                <Nav />
              </SidebarContent>
              <SidebarFooter className="p-4">
                <SidebarMenu>
                  {/* Show settings for admin and auditor users */}
                  {user && (user.role === 'admin' || user.role === 'auditor') && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === '/settings'}
                        tooltip={{ children: 'Settings', side: 'right', align: 'center' }}
                      >
                        <Link href="/settings">
                          <Settings />
                          <span>Settings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset>
              <Header user={user} pageTitle={pageTitle} />
              <main className="flex-1 p-4 md:p-6" data-tour-id="main-content">
                {children}
              </main>
            </SidebarInset>
            {/* Global Chat Components */}
            <ChatButton />
            <GlobalChatPanel />
          </SidebarProvider>
        </GuideProvider>
      </ChatProvider>
    </ThemeProvider>
  );
}
