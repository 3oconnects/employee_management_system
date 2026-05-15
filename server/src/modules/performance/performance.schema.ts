import { z } from 'zod';

export const createPerformanceReviewSchema = z.object({
    employeeId: z.union([z.string(), z.number()]),
    reviewPeriod: z.string(),
    rating: z.coerce.number(),
    strengths: z.string().optional().nullable(),
    improvements: z.string().optional().nullable(),
    goals: z.string().optional().nullable(),
    managerComments: z.string().optional().nullable()
});

export const updatePerformanceReviewSchema = z.object({
    rating: z.coerce.number().optional().nullable(),
    strengths: z.string().optional().nullable(),
    improvements: z.string().optional().nullable(),
    goals: z.string().optional().nullable(),
    managerComments: z.string().optional().nullable(),
    employeeComments: z.string().optional().nullable(),
    status: z.string().optional().nullable()
});
