import { z } from 'zod';

// userId is intentionally excluded from applyLeaveSchema — the controller
// always uses req.user!.userId for this POST mutation; any userId sent in
// the body is ignored.

export const applyLeaveSchema = z.object({
    leave_type_id: z.coerce.number().int().positive('Please select a valid leave type.'),
    start_date: z.string().min(1, 'Start date is required.'),
    end_date: z.string().min(1, 'End date is required.'),
    reason: z.string().optional().nullable()
});

export const updateLeaveSchema = z.object({
    leave_type_id: z.coerce.number().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    reason: z.string().optional().nullable()
});

export const approveLeaveSchema = z.object({
    // approved_by is deliberately not accepted: the approver is always the authenticated user (HF-5)
    action: z.enum(['approved', 'rejected']),
});
