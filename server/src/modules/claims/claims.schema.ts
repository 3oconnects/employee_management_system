import { z } from 'zod';

export const submitClaimSchema = z.object({
    employee_id: z.string(),
    // a claim must be a real, positive amount (a negative or zero claim has no business meaning)
    amount: z.coerce.number().positive().max(10_000_000).finite(),
    category: z.string(),
    description: z.string().optional()
});

export const updateClaimStatusSchema = z.object({
    status: z.enum(['approved', 'rejected'])
});
