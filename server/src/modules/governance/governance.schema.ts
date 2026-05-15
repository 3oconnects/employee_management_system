import { z } from 'zod';

export const updateGovernanceSchema = z.object({
    owner_id: z.number().optional().nullable(),
    ruler_id: z.number().optional().nullable(),
    is_inheritance_blocked: z.boolean().optional()
});
