import { z } from 'zod';

export const createDepartmentSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    manager_id: z.number().optional().nullable(),
    metadata: z.any().optional(),
    category: z.string().optional()
});

export const updateDepartmentSchema = createDepartmentSchema;

export const createTeamSchema = z.object({
    name: z.string(),
    department_id: z.number(),
    parent_team_id: z.number().optional().nullable(),
    description: z.string().optional(),
    manager_id: z.number().optional().nullable(),
    metadata: z.any().optional(),
    category: z.string().optional()
});

export const updateTeamSchema = createTeamSchema.partial();
