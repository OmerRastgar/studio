'use client';

import { useAuth } from '@/components/auth/kratos-auth-provider';
import { hasPermission, UserRole } from '@/lib/permissions';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export function RouteGuard({ children, requiredRoles }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user) {
      // If specific roles are required, check them
      if (requiredRoles && !requiredRoles.includes(user.role as UserRole)) {
        // Redirect to dashboard if user doesn't have permission
        router.push('/dashboard');
        return;
      }

      // Check route permissions based on pathname
      if (!hasPermission(user.role as UserRole, pathname)) {
        console.warn(`RouteGuard: Access denied for ${user.role} at ${pathname}`);
        router.push('/dashboard');
        return;
      }
      console.log(`RouteGuard: Access granted for ${user.role} at ${pathname}`);
    }
  }, [user, loading, pathname, requiredRoles, router]);

  // Show loading while checking permissions
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no user, don't render (auth provider will handle redirect)
  if (!user) {
    return null;
  }

  // Check permissions
  if (requiredRoles && !requiredRoles.includes(user.role as UserRole)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasPermission(user.role as UserRole, pathname)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}