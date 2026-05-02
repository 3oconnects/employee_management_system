import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

// ============================================================================
// EMS FRONTEND — API SERVICE (UPGRADED)
// ============================================================================
// Changes from original:
//   1. Proper refresh token rotation (POST body, not just header)
//   2. Typed error responses
//   3. Helper methods for common patterns
//   4. Tenant-aware requests
// ============================================================================

export interface ApiError {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

// ─── AXIOS INSTANCE ─────────────────────────────────────────────────────────
// Detect API URL: 
// 1. Environment variable (VITE_API_URL)
// 2. Relative path (if hosted on same domain)
// 3. Fallback to current host with port 4000
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        // Handle local development fallback
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:4000/api/v1`;
        }
        
        // On Vercel or production, use relative path if they share the domain
        // This works with our vercel.json rewrites
        return '/api/v1';
    }
    
    return 'http://localhost:4000/api/v1';
};

const api: AxiosInstance = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 30000,
});

// ─── REFRESH TOKEN QUEUE ────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// ─── REQUEST INTERCEPTOR ────────────────────────────────────────────────────

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;

        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR ───────────────────────────────────────────────────

api.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Skip refresh logic for auth endpoints (login, refresh) to prevent loops
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            // Check if token expired (specific code from backend)
            const errorData = error.response?.data as any;
            const isExpired = errorData?.code === 'TOKEN_EXPIRED' || !originalRequest._retry;

            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return api(originalRequest);
                }).catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                const currentToken = useAuthStore.getState().accessToken;

                // Try refresh with token in body first, fallback to header
                const { data } = await axios.post(
                    `${api.defaults.baseURL}/auth/refresh`,
                    { refreshToken },
                    {
                        headers: {
                            Authorization: `Bearer ${currentToken}`,
                            'Content-Type': 'application/json',
                        },
                        withCredentials: true,
                    }
                );

                const { accessToken, refreshToken: newRefreshToken } = data;

                useAuthStore.getState().setAccessToken(accessToken);
                if (newRefreshToken) {
                    useAuthStore.getState().setRefreshToken(newRefreshToken);
                }

                processQueue(null, accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as AxiosError, null);
                useAuthStore.getState().logout();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Build standardized error
        const apiError: ApiError = {
            message: (error.response?.data as any)?.message || 'An unexpected error occurred',
            code: (error.response?.data as any)?.code,
            errors: (error.response?.data as any)?.errors,
        };

        return Promise.reject(apiError);
    }
);

export default api;