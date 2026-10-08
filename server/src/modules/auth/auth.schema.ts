import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, 'Password is required'),
    twoFactorCode: z.string().optional()
});

export const verify2FASchema = z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
    twoFactorCode: z.string().min(6, '6-digit verification code is required')
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

// The only values the product knows. Anything else is rejected instead of being stored.
export const AVAILABILITY_STATUSES = ['available', 'busy', 'away', 'lunch', 'break', 'dnd', 'offline'] as const;

export const updateStatusSchema = z.object({
    status: z.enum(AVAILABILITY_STATUSES, { message: 'Unknown status.' })
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine(data => data.newPassword || data.password, {
    message: 'New password must be at least 6 characters',
    path: ['newPassword']
});

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email('A valid email address is required.'),
});

// The token alone authorises the reset (HF-3). It is mandatory; email is optional and,
// if sent, must match the account the token was issued for.
export const resetPasswordSchema = z.object({
    token: z.string({ error: 'Reset token is required.' }).min(1, 'Reset token is required.'),
    email: z.string().email().optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
}).refine(data => data.newPassword || data.password, {
    message: 'New password must be at least 6 characters',
    path: ['newPassword']
});
