import { z } from 'zod';

// userId is intentionally excluded from applyLeaveSchema — the controller
// always uses req.user!.userId for this POST mutation; any userId sent in
// the body is ignored.

export const applyLeaveSchema = z.object({
    leave_type_id: z.coerce.number(),
    start_date: z.string(),
    end_date: z.string(),
    reason: z.string().optional().nullable()
});

export const updateLeaveSchema = z.object({
    leave_type_id: z.coerce.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    reason: z.string().optional().nullable()
});

export const approveLeaveSchema = z.object({
    action: z.enum(['approved', 'rejected']),
    approved_by: z.union([z.string(), z.number()]).optional()
});
