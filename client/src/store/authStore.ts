import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'admin' | 'hr' | 'manager' | 'employee';

interface User {
  id: number;
  employee_id?: string;
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
    isAuthenticated: boolean;
    setAuth: (user: User, accessToken: string) => void;
    setAccessToken: (token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
            setAccessToken: (accessToken) => set({ accessToken }),
            logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for better security than localStorage
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }), // Don't persist accessToken in storage
        }
    )
);
