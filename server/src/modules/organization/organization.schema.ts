import { z } from 'zod';

const optionalInt = z.union([z.number(), z.string()]).optional().nullable().transform(val => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
});

const requiredInt = z.union([z.number(), z.string()]).transform(val => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
});

export const createDepartmentSchema = z.object({
    name: z.string().min(1, 'Department name is required'),
    description: z.string().optional().nullable(),
    manager_id: optionalInt,
    owner_id: optionalInt,
    metadata: z.any().optional(),
    category: z.string().optional()
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const createTeamSchema = z.object({
    name: z.string().min(1, 'Team name is required'),
    department_id: requiredInt,
    parent_team_id: optionalInt,
    member_ids: z.array(z.string()).max(200).optional(),
    description: z.string().optional().nullable(),
    manager_id: optionalInt,
    owner_id: optionalInt,
    metadata: z.any().optional(),
    category: z.string().optional()
});

export const updateTeamSchema = createTeamSchema.partial();
