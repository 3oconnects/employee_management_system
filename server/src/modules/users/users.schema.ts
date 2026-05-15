import { z } from 'zod';

export const updateProfileSchema = z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    emergency: z.string().optional().nullable()
});
