import { z } from 'zod';

export const submitClaimSchema = z.object({
    employee_id: z.string(),
    amount: z.coerce.number(),
    category: z.string(),
    description: z.string().optional()
});

export const updateClaimStatusSchema = z.object({
    status: z.enum(['approved', 'rejected'])
});
