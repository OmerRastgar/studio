
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
import type { User, Notification } from '@/lib/types';
import { LogOut, Settings, User as UserIcon, Bell, CheckCheck, HelpCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { useGuide } from './guide';
import { mainTourSteps } from '@/lib/guide-steps';
import { mockNotifications as initialMockNotifications } from '@/lib/data';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface HeaderProps {
  user: User;
  pageTitle: string;
}

export function Header({ user, pageTitle }: HeaderProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialMockNotifications);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };
  
  const { startTour } = useGuide();
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };
  
  const handleClearAll = () => {
      setNotifications([]);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl font-headline">{pageTitle}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <ThemeToggle />

        <Button variant="ghost" className="h-10 w-10 rounded-full" onClick={() => startTour(mainTourSteps, 'mainTour', true)}>
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Start Tour</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute top-2 right-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                  {unreadCount}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96" align="end">
            <DropdownMenuLabel>
              <div className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                    <Button variant="outline" size="sm" className="h-7 gap-1" onClick={handleMarkAllAsRead}>
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span className="text-muted-foreground">Mark all as read</span>
                    </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
                <DropdownMenuGroup>
                    {notifications.map(notification => {
                        const Icon = notification.icon;
                        return (
                            <DropdownMenuItem key={notification.id} className="flex items-start gap-3 p-3">
                                <div className="relative">
                                    <Icon className="h-5 w-5 mt-1" />
                                    {!notification.isRead && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/90"></span>
                                        </span>
                                    )}
                                </div>
                                <div className='grid gap-1'>
                                    <p className='font-medium leading-none'>{notification.title}</p>
                                    <p className='text-sm text-muted-foreground'>{notification.description}</p>
                                    <p className='text-xs text-muted-foreground/80'>{formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}</p>
                                </div>
                            </DropdownMenuItem>
                        )
                    })}
                </DropdownMenuGroup>
            ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <div className="flex justify-between items-center w-full">
                    <Link href="/audit-log" className={cn(
                        'text-sm font-medium text-primary', 
                        notifications.length === 0 && 'pointer-events-none opacity-50'
                    )}>
                      View all
                    </Link>
                    <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={notifications.length === 0}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        Clear all
                    </Button>
                </div>
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
