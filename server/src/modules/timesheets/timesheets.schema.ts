import { z } from 'zod';

export const saveTimesheetEntriesSchema = z.object({
    entries: z.array(z.object({
        project_name: z.string(),
        task_desc: z.string().optional().nullable(),
        mon_hours: z.union([z.string(), z.number()]).optional(),
        tue_hours: z.union([z.string(), z.number()]).optional(),
        wed_hours: z.union([z.string(), z.number()]).optional(),
        thu_hours: z.union([z.string(), z.number()]).optional(),
        fri_hours: z.union([z.string(), z.number()]).optional(),
        sat_hours: z.union([z.string(), z.number()]).optional(),
        sun_hours: z.union([z.string(), z.number()]).optional()
    }))
});

export const approveTimesheetSchema = z.object({
    // approved_by is deliberately not accepted: the approver is always the authenticated user (HF-5)
    action: z.enum(['approved', 'rejected']),
    remarks: z.string().optional().nullable()
});
