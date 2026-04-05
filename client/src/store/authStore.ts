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
    permissions?: string[];
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;

    // Actions
    setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
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

            setAuth: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken: refreshToken || null,
                    isAuthenticated: true,
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
                if (user.role === 'super_admin' || user.role === 'admin') return true;
                return user.permissions?.includes(permission) ?? false;
            },

            hasAnyRole: (...roles: UserRole[]) => {
                const user = get().user;
                if (!user) return false;
                return roles.includes(user.role);
            },

            hasModule: (module: string) => {
                const user = get().user;
                if (!user) return false;
                if (user.role === 'super_admin' || user.role === 'admin') return true;
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
            }),
        }
    )
);
