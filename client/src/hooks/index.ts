// ============================================================================
// EMS FRONTEND — CUSTOM HOOKS
// ============================================================================
// Reusable hooks for:
//   1. useApi       — Generic data fetching with loading/error states
//   2. useAuth      — Auth convenience wrapper
//   3. usePermission— Permission checking
//   4. usePagination— Pagination state management
//   5. useDebounce  — Input debouncing
//   6. useNotification — Toast/notification management
// ============================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';
import { useAuthStore, UserRole } from '../store/authStore';

// ─── useApi ─────────────────────────────────────────────────────────────────
// Generic data-fetching hook with loading, error, and refetch support.

interface UseApiOptions {
    immediate?: boolean;  // Fetch on mount? Default: true
    deps?: any[];         // Dependencies to trigger refetch
}

interface UseApiReturn<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useApi<T = any>(
    url: string,
    options: UseApiOptions = {}
): UseApiReturn<T> {
    const { immediate = true, deps = [] } = options;
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(url);
            if (mountedRef.current) {
                // Support both { data: ... } and direct response shapes
                setData(response.data?.data ?? response.data);
            }
        } catch (err: any) {
            if (mountedRef.current) {
                setError(err.message || 'Failed to fetch data');
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [url]);

    useEffect(() => {
        mountedRef.current = true;
        if (immediate) fetchData();
        return () => { mountedRef.current = false; };
    }, [immediate, ...deps]);

    return { data, loading, error, refetch: fetchData };
}

// ─── useAuth ────────────────────────────────────────────────────────────────
// Convenience wrapper around the auth store.

export function useAuth() {
    const store = useAuthStore();

    const login = useCallback(async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        const { user, accessToken, refreshToken } = response.data;
        store.setAuth(user, accessToken, refreshToken);
        return user;
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Logout even if API call fails
        }
        store.logout();
    }, []);

    const updateProfile = useCallback(async (updates: Record<string, any>) => {
        const response = await api.put('/auth/me', updates);
        if (response.data.user) {
            store.updateUser(response.data.user);
        }
        return response.data;
    }, []);

    return {
        user: store.user,
        isAuthenticated: store.isAuthenticated,
        login,
        logout,
        updateProfile,
        hasPermission: store.hasPermission,
        hasAnyRole: store.hasAnyRole,
        hasModule: store.hasModule,
    };
}

// ─── usePermission ──────────────────────────────────────────────────────────
// Check specific permissions for conditional rendering.

export function usePermission(permission: string): boolean {
    const hasPermission = useAuthStore((state) => state.hasPermission);
    return hasPermission(permission);
}

export function useModuleAccess(module: string): boolean {
    const hasModule = useAuthStore((state) => state.hasModule);
    return hasModule(module);
}

export function useRoleCheck(...roles: UserRole[]): boolean {
    const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
    return hasAnyRole(...roles);
}

// ─── usePagination ──────────────────────────────────────────────────────────
// Manages pagination state for data tables.

interface UsePaginationOptions {
    initialPage?: number;
    initialLimit?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
    const { initialPage = 1, initialLimit = 10 } = options;
    const [page, setPage] = useState(initialPage);
    const [limit, setLimit] = useState(initialLimit);
    const [totalItems, setTotalItems] = useState(0);

    const totalPages = useMemo(() => Math.ceil(totalItems / limit), [totalItems, limit]);

    const goToPage = useCallback((p: number) => {
        setPage(Math.max(1, Math.min(p, totalPages || 1)));
    }, [totalPages]);

    const nextPage = useCallback(() => goToPage(page + 1), [page, goToPage]);
    const prevPage = useCallback(() => goToPage(page - 1), [page, goToPage]);

    const reset = useCallback(() => {
        setPage(initialPage);
    }, [initialPage]);

    return {
        page, limit, totalItems, totalPages,
        setPage: goToPage, setLimit, setTotalItems,
        nextPage, prevPage, reset,
        // Build query params
        queryParams: `page=${page}&limit=${limit}`,
    };
}

// ─── useDebounce ────────────────────────────────────────────────────────────
// Debounces a value (e.g., search input).

export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ─── useNotification ────────────────────────────────────────────────────────
// In-app notification state (toast-like).

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastNotification {
    id: string;
    type: NotificationType;
    message: string;
    duration: number;
}

const toastListeners: Array<(toast: ToastNotification) => void> = [];

export function addToastListener(listener: (toast: ToastNotification) => void) {
    toastListeners.push(listener);
    return () => {
        const idx = toastListeners.indexOf(listener);
        if (idx >= 0) toastListeners.splice(idx, 1);
    };
}

export function showToast(type: NotificationType, message: string, duration: number = 4000) {
    const toast: ToastNotification = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        type,
        message,
        duration,
    };
    toastListeners.forEach(fn => fn(toast));
}

export function useToast() {
    return {
        success: (msg: string) => showToast('success', msg),
        error: (msg: string) => showToast('error', msg),
        info: (msg: string) => showToast('info', msg),
        warning: (msg: string) => showToast('warning', msg),
    };
}
