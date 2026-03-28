import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

export interface ApiError {
    message: string;
    code?: string;
    errors?: Record<string, string[]>;
}

/*
  IMPORTANT:
  Your backend runs on port 4000
  so baseURL must point there
*/

const api: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },

    // for cookie based auth
    withCredentials: true
});


let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};


// REQUEST INTERCEPTOR
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


// RESPONSE INTERCEPTOR
api.interceptors.response.use(
    (response) => response,

    async (error: AxiosError) => {

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {

            if (isRefreshing) {

                return new Promise((resolve, reject) => {

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

                const { data } = await axios.post(
                    `http://localhost:4000/api/v1/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { accessToken } = data;

                useAuthStore.getState().setAccessToken(accessToken);

                processQueue(null, accessToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }

                return api(originalRequest);

            } catch (refreshError) {

                processQueue(refreshError as AxiosError, null);

                useAuthStore.getState().logout();

                return Promise.reject(refreshError);

            } finally {

                isRefreshing = false;

            }
        }

        const apiError: ApiError = {
            message: (error.response?.data as any)?.message || 'An unexpected error occurred',
            code: (error.response?.data as any)?.code,
            errors: (error.response?.data as any)?.errors,
        };

        return Promise.reject(apiError);
    }
);

export default api;