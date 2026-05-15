import { z } from 'zod';

export const createApprovalSchema = z.object({
    employeeId: z.union([z.string(), z.number()]),
    type: z.string(),
    status: z.string().optional()
});

export const updateApprovalActionSchema = z.object({
    action: z.enum(['approve', 'reject']),
    type: z.string()
});
