import type { UserRole } from '../store/authStore';

// The pages the global search may offer, with the same role lists the sidebar and the routes in App.tsx use.
// Empty roles = every signed-in person. The server still protects the data; this only avoids offering dead ends.
export interface SearchPage { label: string; path: string; icon: string; roles: UserRole[]; keywords?: string }

export const SEARCH_PAGES: SearchPage[] = [
    { label: 'Dashboard',  path: '/dashboard',    icon: '⊞',  roles: [] },
    { label: 'My Profile', path: '/profile',      icon: '👤', roles: [] },
    { label: 'Approvals',  path: '/approvals',    icon: '✅', roles: ['admin', 'hr', 'manager', 'super_admin'] },
    { label: 'Employees',  path: '/employees',    icon: '👥', roles: ['admin', 'hr', 'manager', 'super_admin'] },
    { label: 'Onboarding', path: '/onboarding',   icon: '🧑‍💼', roles: ['admin', 'hr', 'super_admin'] },
    { label: 'Hierarchy',  path: '/organization', icon: '🏢', roles: ['admin', 'hr', 'super_admin'], keywords: 'organization departments teams' },
    { label: 'Attendance', path: '/attendance',   icon: '🕐', roles: [] },
    { label: 'Leave',      path: '/leave',        icon: '📅', roles: [], keywords: 'time off' },
    { label: 'Timesheet',  path: '/timesheet',    icon: '📋', roles: [] },
    { label: 'Payroll',    path: '/payroll',      icon: '💳', roles: ['admin', 'hr', 'employee', 'super_admin'] },
    { label: 'Reports',    path: '/reports',      icon: '📊', roles: ['admin', 'hr', 'super_admin'], keywords: 'analytics' },
    { label: 'Audit Logs', path: '/audit-logs',   icon: '🛡️', roles: ['admin', 'super_admin'], keywords: 'audit' },
    { label: 'Settings',   path: '/settings',     icon: '⚙️', roles: ['admin', 'super_admin'], keywords: 'roles permissions' },
];

const EMPLOYEE_SEARCH_ROLES: UserRole[] = ['admin', 'hr', 'manager', 'super_admin'];

type HasAnyRole = (...roles: UserRole[]) => boolean;

export const pagesFor = (hasAnyRole: HasAnyRole, query = ''): SearchPage[] => {
    const q = query.trim().toLowerCase();
    return SEARCH_PAGES
        .filter((p) => p.roles.length === 0 || hasAnyRole(...p.roles))
        .filter((p) => !q || p.label.toLowerCase().includes(q) || (p.keywords ?? '').includes(q));
};

/** Same rule as the Employees page itself. */
export const canSearchEmployees = (hasAnyRole: HasAnyRole): boolean => hasAnyRole(...EMPLOYEE_SEARCH_ROLES);
