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

const user: User = {
  name: 'Admin Auditor',
  email: 'admin@auditace.com',
  avatarUrl: 'https://picsum.photos/seed/user1/100/100',
  role: 'admin',
};

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
  const pageTitle =
    pathname.split('/').pop()?.replace('-', ' ')?.replace(/\b\w/g, (l) => l.toUpperCase()) ||
    'Dashboard';

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
                <Image src="/Logo.png" alt="CyberGaar Audit Platform Logo" width={120} height={40} className="group-data-[collapsible=icon]:hidden" />
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
