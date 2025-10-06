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
import type { User } from '@/lib/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/providers';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { GuideProvider } from '@/components/guide';

// In a real app, this would come from an auth context or API call
const currentUser: User = {
  name: 'Admin Auditor',
  email: 'admin@auditace.com',
  avatarUrl: 'https://picsum.photos/seed/user1/100/100',
  role: 'admin', // Switch between 'admin', 'auditor', 'customer', 'reviewer'
};

function Nav() {
  const pathname = usePathname();
  
  const allNavItems = [
    { href: '/dashboard', title: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'auditor', 'customer', 'manager', 'reviewer'], tourId: 'dashboard' },
    { href: '/reports', title: 'Report Generation', icon: FileText, roles: ['admin', 'auditor', 'manager'], tourId: 'report-generation' },
    { href: '/agents', title: 'Agents', icon: Bot, roles: ['admin', 'customer'], tourId: 'agents' },
    { href: '/learning', title: 'Learning', icon: BookOpen, roles: ['admin', 'auditor', 'customer'], tourId: 'learning' },
    { href: '/evidence', title: 'Evidence', icon: Database, roles: ['admin', 'auditor', 'customer', 'manager'], tourId: 'evidence' },
    { href: '/users', title: 'Users', icon: Users, roles: ['admin', 'manager'], tourId: 'users' },
    { href: '/audit-log', title: 'Audit Log', icon: ScrollText, roles: ['admin', 'manager'], tourId: 'audit-log' },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(currentUser.role));

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
  const pageTitle =
    pathname.split('/').pop()?.replace('-', ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
    'Dashboard';
  
  const user = currentUser;

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
                <div className="text-lg font-bold font-headline group-data-[collapsible=icon]:hidden">AuditAce</div>
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
