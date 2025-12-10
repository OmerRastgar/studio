// Role-based access control utilities

export type UserRole = 'admin' | 'manager' | 'auditor' | 'customer' | 'compliance' | 'reviewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

// Define permissions for each route prefix
// Routes are matched using startsWith for flexibility
export const routePermissions: Record<string, UserRole[]> = {
  // Main dashboard (all roles)
  '/dashboard': ['admin', 'manager', 'auditor', 'customer', 'compliance'],

  // Admin-only routes
  '/dashboard/admin': ['admin'],
  '/users': ['admin', 'manager'],
  '/settings': ['admin'],

  // Manager routes (admin + manager)
  '/dashboard/manager': ['admin', 'manager'],

  // Auditor routes (admin + auditor)
  '/dashboard/auditor': ['admin', 'auditor'],

  // Customer routes (admin + customer)
  '/dashboard/customer': ['admin', 'customer'],

  // Compliance routes
  // Note: /compliance/users is for customers to manage compliance users
  // /compliance/dashboard and /compliance/projects are for compliance users

  // Shared routes
  '/reports': ['admin', 'manager', 'auditor'],
  '/agents': ['admin', 'manager', 'auditor', 'customer'],
  '/learning': ['admin', 'manager', 'auditor', 'customer'],
  '/evidence': ['admin', 'manager', 'auditor', 'customer'],
  '/audit-log': ['admin', 'manager', 'auditor'],
  '/chat': ['admin', 'manager', 'auditor', 'customer', 'compliance'],

  // Project routes - redirect to role-specific project pages
  '/dashboard/projects': ['admin', 'manager', 'auditor'],
  '/dashboard/project': ['admin', 'manager', 'auditor', 'customer'],
};

// Check if user has permission to access a route
// Uses prefix matching for more flexible route checking
export function hasPermission(userRole: UserRole, route: string): boolean {
  // Sort routes by length (longest first) for most specific match
  const sortedRoutes = Object.keys(routePermissions)
    .sort((a, b) => b.length - a.length);

  for (const routePrefix of sortedRoutes) {
    if (route.startsWith(routePrefix)) {
      const allowedRoles = routePermissions[routePrefix];
      return allowedRoles.includes(userRole);
    }
  }

  // Default: allow access if route not explicitly defined
  // This allows for new routes without updating permissions
  return true;
}

// Get accessible routes for a user role
export function getAccessibleRoutes(userRole: UserRole): string[] {
  return Object.keys(routePermissions).filter(route =>
    routePermissions[route].includes(userRole)
  );
}

// Navigation items with role-based filtering
export const navigationItems = [
  {
    href: '/dashboard',
    title: 'Dashboard',
    roles: ['admin', 'manager', 'auditor', 'customer', 'compliance'] as UserRole[]
  },
  {
    href: '/reports',
    title: 'Report Generation',
    roles: ['admin', 'manager', 'auditor'] as UserRole[]
  },
  {
    href: '/agents',
    title: 'Agents',
    roles: ['admin', 'manager', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/learning',
    title: 'Learning',
    roles: ['admin', 'manager', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/evidence',
    title: 'Evidence',
    roles: ['admin', 'manager', 'auditor', 'customer'] as UserRole[]
  },
  {
    href: '/users',
    title: 'Users',
    roles: ['admin', 'manager'] as UserRole[]
  },
  {
    href: '/audit-log',
    title: 'Audit Log',
    roles: ['admin', 'manager', 'auditor'] as UserRole[]
  },
];

// Filter navigation items by user role
export function getNavigationForRole(userRole: UserRole) {
  return navigationItems.filter(item => item.roles.includes(userRole));
}

// Get the appropriate dashboard path for a role
export function getDashboardPath(userRole: UserRole): string {
  switch (userRole) {
    case 'admin':
      return '/dashboard';
    case 'manager':
      return '/dashboard';
    case 'auditor':
      return '/dashboard';
    case 'customer':
      return '/dashboard';
    case 'compliance':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}

// Get the appropriate projects path for a role
export function getProjectsPath(userRole: UserRole): string {
  switch (userRole) {
    case 'admin':
      return '/dashboard/admin/projects';
    case 'manager':
      return '/dashboard/manager/projects';
    case 'auditor':
      return '/dashboard/auditor/projects';
    case 'customer':
      return '/dashboard';
    case 'compliance':
      return '/dashboard';
    default:
      return '/dashboard';
  }
}