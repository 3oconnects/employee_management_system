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
    action: z.enum(['approved', 'rejected']),
    approved_by: z.union([z.string(), z.number()]).optional(),
    remarks: z.string().optional().nullable()
});
