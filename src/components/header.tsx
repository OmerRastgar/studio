'use client';

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
import { LogOut, Settings, User as UserIcon, Bell, CheckCheck, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useGuide } from './guide';

interface HeaderProps {
  user: User;
  pageTitle: string;
}

const mockNotifications = [
    { id: 1, title: "New evidence uploaded", description: "John Smith uploaded 'Admin Panel Login Attempt Screenshot'.", time: "5m ago" },
    { id: 2, title: "Report section generated", description: "AI completed the analysis for 'Access Control Policy'.", time: "25m ago" },
    { id: 3, title: "Team Chat Mention", description: "Jane Doe mentioned you in the 'ISO 27001 Certification' report.", time: "1h ago" },
];


export function Header({ user, pageTitle }: HeaderProps) {
  const { setTourEnabled } = useGuide();
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl font-headline">{pageTitle}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <ThemeToggle />

        <Button variant="ghost" className="h-10 w-10 rounded-full" onClick={() => setTourEnabled(true)}>
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Start Tour</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Bell className="h-5 w-5" />
              {mockNotifications.length > 0 && (
                <Badge className="absolute top-2 right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                  {mockNotifications.length}
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
            <DropdownMenuGroup>
                {mockNotifications.map(notification => (
                    <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1">
                        <p className='font-medium'>{notification.title}</p>
                        <p className='text-xs text-muted-foreground'>{notification.description}</p>
                        <p className='text-xs text-muted-foreground/70'>{notification.time}</p>
                    </DropdownMenuItem>
                ))}
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
                <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="person avatar" />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
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
            <DropdownMenuItem asChild>
               <Link href="/login">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
