import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================================================
// EMS FRONTEND — AUTH STORE (UPGRADED)
// ============================================================================
// Changes:
//   1. Added `permissions` array to user object
//   2. Added `tenantId` tracking
//   3. Added `refreshToken` storage
//   4. Added `hasPermission()` and `hasAnyRole()` helpers
//   5. Preserved backward compatibility with existing components
// ============================================================================

export type UserRole = 'super_admin' | 'admin' | 'hr' | 'manager' | 'employee';

export interface User {
    id: number;
    employee_id?: string;
    tenant_id?: string;
    name: string;
    email: string;
    role: UserRole;
    phone?: string;
    address?: string;
    emergency?: string;
    availability_status?: string;
    avatar_url?: string;
    permissions?: string[];
    preferences?: any;
    dashboard_type?: 'admin' | 'manager' | 'employee';
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    mustChangePassword: boolean;

    // Actions
    setAuth: (user: User, accessToken: string, refreshToken?: string, mustChangePassword?: boolean) => void;
    setAccessToken: (token: string) => void;
    setRefreshToken: (token: string) => void;
    updateUser: (updates: Partial<User>) => void;
    logout: () => void;

    // Permission helpers
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (...permissions: string[]) => boolean;
    hasAnyRole: (...roles: UserRole[]) => boolean;
    hasModule: (module: string) => boolean;
}

const PERM_ALIASES: Record<string, string[]> = {
    'employee.view': ['employees:read', 'employees:manage', 'employees.read', 'employees.view'],
    'employee.manage': ['employees:manage', 'employees.manage'],
    'employees.view': ['employees:read', 'employees:manage'],
    'employees.read': ['employees:read', 'employees:manage'],
    'payroll.process': ['payroll:manage', 'payroll.manage', 'payroll:run'],
    'payroll.manage': ['payroll:manage', 'payroll.manage'],
    'payroll.read': ['payroll:read', 'payroll:manage'],
    'payroll.view': ['payroll:read', 'payroll:manage'],
    'claims.approve': ['claims:approve'],
    'claims.submit': ['claims:submit'],
    'leave.apply': ['leave:apply', 'leave:manage'],
    'leave.approve': ['leave:approve', 'leave:manage'],
    'leave.view': ['leave:view', 'leave:read', 'leave:approve', 'leave:manage'],
    'timesheet.submit': ['timesheet:submit', 'timesheet:manage'],
    'timesheet.approve': ['timesheet:approve', 'timesheet:manage'],
    'reports.view': ['reports:view', 'reports:read'],
    'settings.manage': ['settings:manage'],
    'audit.read': ['audit:read', 'audit:view'],
    'audit.view': ['audit:read', 'audit:view'],
    'organization.read': ['organization:read', 'organization:manage', 'governance:read'],
    'organization.manage': ['organization:manage', 'governance:manage'],
    'onboarding.manage': ['onboarding:manage'],
    'approvals.manage': ['approvals:manage', 'leave:approve', 'timesheet:approve', 'claims:approve']
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            mustChangePassword: false,

            setAuth: (user, accessToken, refreshToken, mustChangePassword = false) =>
                set((state) => ({
                    user,
                    accessToken,
                    refreshToken: refreshToken !== undefined ? (refreshToken || null) : state.refreshToken,
                    isAuthenticated: true,
                    mustChangePassword,
                })),

            setAccessToken: (accessToken) => set({ accessToken }),

            setRefreshToken: (refreshToken) => set({ refreshToken }),

            updateUser: (updates) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...updates } : null,
                })),

            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),

            // ─── DYNAMIC PERMISSION HELPERS ──────────────────────────────
            hasPermission: (permission: string) => {
                const user = get().user;
                if (!user) return false;
                const role = (user.role || '').toLowerCase();
                // Super Admin has system-wide pass-through
                if (role === 'super_admin') return true;

                const userPerms = (user.permissions || []).map(p => p.toLowerCase());
                const target = permission.toLowerCase();

                // Direct match (raw, dot format, colon format)
                if (userPerms.includes(target)) return true;
                if (userPerms.includes(target.replace('.', ':'))) return true;
                if (userPerms.includes(target.replace(':', '.'))) return true;

                // Check defined aliases
                const aliases = PERM_ALIASES[target] || [];
                for (const alias of aliases) {
                    if (userPerms.includes(alias.toLowerCase())) return true;
                }

                return false;
            },

            hasAnyPermission: (...permissions: string[]) => {
                return permissions.some(p => get().hasPermission(p));
            },

            hasAnyRole: (...roles: UserRole[]) => {
                const user = get().user;
                if (!user) return false;
                const userRole = (user.role || '').toLowerCase();
                const dashType = user.dashboard_type || 'employee';

                if (roles.some(r => r.toLowerCase() === userRole)) return true;

                const isSystemAdmin = user.name === 'System Admin' || (user.email && user.email.toLowerCase() === 'admin@company.com');
                if (isSystemAdmin && roles.includes('admin' as UserRole)) return true;

                if (roles.includes('admin' as UserRole) && (dashType === 'admin' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'administrator')) return true;
                if (roles.includes('manager' as UserRole) && (dashType === 'manager' || userRole === 'manager')) return true;
                if (roles.includes('employee' as UserRole) && (dashType === 'employee' || userRole === 'employee')) return true;

                return false;
            },

            hasModule: (module: string) => {
                const user = get().user;
                if (!user) return false;
                if ((user.role || '').toLowerCase() === 'super_admin') return true;

                const coreEmployeeModules = ['dashboard', 'attendance', 'leave', 'timesheet', 'payroll', 'profile'];
                if (coreEmployeeModules.includes(module.toLowerCase())) return true;

                return get().hasAnyPermission(`${module}:read`, `${module}:manage`, `${module}:view`, `${module}.view`, `${module}.read`);
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                mustChangePassword: state.mustChangePassword,
            }),
        }
    )
);
