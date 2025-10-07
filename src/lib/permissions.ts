// Role-based access control utilities

export type UserRole = 'admin' | 'auditor' | 'customer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

// Define permissions for each route
export const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['admin', 'auditor', 'customer'],
  '/reports': ['admin', 'auditor'],
  '/agents': ['admin', 'auditor', 'customer'],
  '/learning': ['admin', 'auditor', 'customer'],
  '/evidence': ['admin', 'auditor', 'customer'],
  '/users': ['admin'],
  '/audit-log': ['admin', 'auditor'],
  '/settings': ['admin'],
};

// Check if user has permission to access a route
export function hasPermission(userRole: UserRole, route: string): boolean {
  const allowedRoles = routePermissions[route];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
}

// Get accessible routes for a user role
export function getAccessibleRoutes(userRole: UserRole): string[] {
  return Object.keys(routePermissions).filter(route => 
    hasPermission(userRole, route)
  );
}

// Navigation items with role-based filtering
export const navigationItems = [
  {
    href: '/dashboard',
    title: 'Dashboard',
    roles: ['admin', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/reports',
    title: 'Report Generation',
    roles: ['admin', 'auditor'] as UserRole[]
  },
  {
    href: '/agents',
    title: 'Agents',
    roles: ['admin', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/learning',
    title: 'Learning',
    roles: ['admin', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/evidence',
    title: 'Evidence',
    roles: ['admin', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/users',
    title: 'Users',
    roles: ['admin'] as UserRole[]
  },
  {
    href: '/audit-log',
    title: 'Audit Log',
    roles: ['admin', 'auditor'] as UserRole[]
  },
];

// Filter navigation items by user role
export function getNavigationForRole(userRole: UserRole) {
  return navigationItems.filter(item => item.roles.includes(userRole));
}