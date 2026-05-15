import { z } from 'zod';

// userId is intentionally excluded — the controller always uses req.user!.userId
// for POST mutations; any userId sent in the body is ignored.

export const checkInSchema = z.object({}).passthrough();

export const checkOutSchema = z.object({}).passthrough();

export const regularizeSchema = z.object({
    date: z.string(),
    check_in_time: z.string(),
    check_out_time: z.string().optional().nullable(),
    reason: z.string().optional()
}).passthrough();
