import { z } from 'zod';

/**
 * ARC-01: Profile Ownership Hardening.
 * Do not accept: id, userId, tenantId, role, permissions from the client.
 * The target user is derived exclusively from req.user!.userId in the controller.
 */
export const updateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    emergency: z.string().optional().nullable(),
}).refine(data => (data.name && data.name.length > 0) || (data.first_name && data.first_name.length > 0), {
    message: 'Name or first_name is required',
    path: ['name']
});
