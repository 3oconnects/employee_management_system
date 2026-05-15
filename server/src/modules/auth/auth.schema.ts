import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required')
});

export const refreshSchema = z.object({
    refreshToken: z.string().optional()
});

export const updateProfileSchema = z.object({
    name: z.string().optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    emergency: z.string().optional().nullable(),
    preferences: z.any().optional()
});

export const updatePreferencesSchema = z.object({
    preferences: z.any()
});

export const updateStatusSchema = z.object({
    status: z.string().min(1, 'Status is required')
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
});
