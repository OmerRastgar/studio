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

const Logo = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-8 h-8 text-primary"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-12h2v8h-2zm-2-2h6v2h-6z"/>
      <path d="M7,7h10v2h-10z M7,15h10v2h-10z M7,11h10v2h-10z" fill="none"/>
      <path d="M16.5,8.5H7.5c-0.83,0-1.5,0.67-1.5,1.5v4c0,0.83,0.67,1.5,1.5,1.5h9c0.83,0,1.5-0.67,1.5-1.5v-4 C18,9.17,17.33,8.5,16.5,8.5z M16,14H8v-3h8V14z"/>
      <path d="M19,5H5C3.9,5,3,5.9,3,7v10c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V7C21,5.9,20.1,5,19,5z M19,17H5V7h14V17z M8,10h8v4H8V10z" fill="none"/>
      <path d="M19.41,5H4.59C3.16,5,2,6.16,2,7.59v8.82C2,17.84,3.16,19,4.59,19h14.82c1.43,0,2.59-1.16,2.59-2.59V7.59 C22,6.16,20.84,5,19.41,5z M20,16.41c0,0.88-0.72,1.59-1.59,1.59H5.59C4.72,18,4,17.29,4,16.41V7.59C4,6.72,4.72,6,5.59,6h12.82 C19.28,6,20,6.72,20,7.59V16.41z"/>
      <path d="M15.5,10.5h-7c-0.55,0-1,0.45-1,1v1c0,0.55,0.45,1,1,1h7c0.55,0,1-0.45,1-1v-1C16.5,10.95,16.05,10.5,15.5,10.5z"/>
    </svg>
  );

  const AppLogo = ({ className }: { className?: string }) => (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('fill-current', className)}
    >
      <path d="M16.225 3.12h-8.45A4.656 4.656 0 0 0 3.12 7.775v8.45A4.656 4.656 0 0 0 7.775 20.88h8.45a4.656 4.656 0 0 0 4.655-4.655v-8.45A4.656 4.656 0 0 0 16.225 3.12zm2.81 13.105a2.81 2.81 0 0 1-2.81 2.81h-8.45a2.81 2.81 0 0 1-2.81-2.81v-8.45a2.81 2.81 0 0 1 2.81-2.81h8.45a2.81 2.81 0 0 1 2.81 2.81v8.45zM15.22 7.82h-6.44a1.8 1.8 0 0 0-1.8 1.8v4.88a1.8 1.8 0 0 0 1.8 1.8h6.44a1.8 1.8 0 0 0 1.8-1.8V9.62a1.8 1.8 0 0 0-1.8-1.8zm.36 6.68a.36.36 0 0 1-.36.36h-6.44a.36.36 0 0 1-.36-.36V9.62c0-.2.162-.36.36-.36h6.44c.2 0 .36.162.36.36v4.88z" />
    </svg>
);


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
        <SidebarMenuItem key={item.href}>
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
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AppLogo className="w-8 h-8 text-primary" />
                <h2 className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">Audit Gar</h2>
              </div>
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
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
