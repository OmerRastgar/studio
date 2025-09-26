'use client';

import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger
} from '@/components/ui/sidebar';
import { Header } from '@/components/header';
import {
  LayoutDashboard,
  FileText,
  Database,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Bot,
  BookOpen
} from 'lucide-react';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from '@/components/providers';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Guide, GuideProvider } from '@/components/guide';


// Mock user data for layout
const user: User = {
  name: 'Admin Auditor',
  email: 'admin@auditace.com',
  avatarUrl: 'https://picsum.photos/seed/user1/100/100',
  role: 'admin',
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
};

function Nav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', title: 'Dashboard', icon: LayoutDashboard },
    { href: '/reports', title: 'Report Generation', icon: FileText },
    { href: '/agents', title: 'Agents', icon: Bot },
    { href: '/learning', title: 'Learning', icon: BookOpen },
    { href: '/evidence', title: 'Evidence', icon: Database },
    { href: '/audit-log', title: 'Audit Log', icon: ScrollText },
    { href: '/users', title: 'Users', icon: Users },
  ];

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href} data-tour-id={item.title.toLowerCase().replace(' ', '-')}>
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
  const [tourEnabled, setTourEnabled] = useState(false);
  const [initialStep, setInitialStep] = useState(0);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <GuideProvider setTourEnabled={setTourEnabled}>
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader className="p-4">
              <div className="flex items-center justify-between" data-tour-id="logo">
                <Image src="/Logo.png" alt="Audit Gar Logo" width={120} height={40} className="group-data-[collapsible=icon]:hidden" />
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
            <Guide
              tourEnabled={tourEnabled}
              setTourEnabled={setTourEnabled}
              initialStep={initialStep}
              setInitialStep={setInitialStep}
            />
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
