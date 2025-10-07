'use client';

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
  Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/providers';
import { GuideProvider } from '@/components/guide';
import { useAuth } from '../auth-provider';
import { useRouter } from 'next/navigation';

function Nav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', title: 'Dashboard', icon: LayoutDashboard, tourId: 'dashboard' },
    { href: '/reports', title: 'Report Generation', icon: FileText, tourId: 'report-generation' },
    { href: '/agents', title: 'Agents', icon: Bot, tourId: 'agents' },
    { href: '/learning', title: 'Learning', icon: BookOpen, tourId: 'learning' },
    { href: '/evidence', title: 'Evidence', icon: Database, tourId: 'evidence' },
    { href: '/users', title: 'Users', icon: Users, tourId: 'users' },
    { href: '/audit-log', title: 'Audit Log', icon: ScrollText, tourId: 'audit-log' },
  ];

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
  
  const pageTitle =
    pathname.split('/').pop()?.replace('-', ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
    'Dashboard';

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If no user is authenticated, redirect to login
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
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
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <Header user={user} pageTitle={pageTitle} />
            <main className="flex-1 p-4 md:p-6" data-tour-id="main-content">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </GuideProvider>
    </ThemeProvider>
  );
}
