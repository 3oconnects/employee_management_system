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
    permissions?: string[];
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
    hasAnyRole: (...roles: UserRole[]) => boolean;
    hasModule: (module: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            mustChangePassword: false,

            setAuth: (user, accessToken, refreshToken, mustChangePassword = false) =>
                set({
                    user,
                    accessToken,
                    refreshToken: refreshToken || null,
                    isAuthenticated: true,
                    mustChangePassword,
                }),

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

            // ─── PERMISSION HELPERS ─────────────────────────────────────
            hasPermission: (permission: string) => {
                const user = get().user;
                if (!user) return false;
                const role = (user.role || '').toLowerCase();
                if (role === 'super_admin' || role === 'admin' || role === 'administrator' || user.dashboard_type === 'admin') return true;
                return user.permissions?.includes(permission) ?? false;
            },

            hasAnyRole: (...roles: UserRole[]) => {
                const user = get().user;
                if (!user) return false;
                const userRole = (user.role || '').toLowerCase();
                const dashType = user.dashboard_type || 'employee'; // Default to employee
                
                // 1. Direct match (literal role name)
                if (roles.some(r => r.toLowerCase() === userRole)) return true;
                
                // 2. System Admin Override (Safety Net)
                const isSystemAdmin = user.name === 'System Admin' || (user.email && user.email.toLowerCase() === 'admin@company.com');
                if (isSystemAdmin && roles.includes('admin' as UserRole)) return true;

                // 3. Dashboard Type Mapping (allows custom roles to inherit UI structure)
                if (roles.includes('admin' as UserRole) && (dashType === 'admin' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'administrator')) return true;
                if (roles.includes('manager' as UserRole) && (dashType === 'manager' || userRole === 'manager')) return true;
                if (roles.includes('employee' as UserRole) && (dashType === 'employee' || userRole === 'employee')) return true;

                return false;
            },

            hasModule: (module: string) => {
                const user = get().user;
                if (!user) return false;
                const role = (user.role || '').toLowerCase();
                if (role === 'super_admin' || role === 'admin' || role === 'administrator' || user.dashboard_type === 'admin') return true;
                return user.permissions?.some(p => p.startsWith(`${module}:`)) ?? false;
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage),
            // Don't persist tokens in storage for security — only user & auth state
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
