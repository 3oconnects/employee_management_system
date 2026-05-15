import { z } from 'zod';

export const updatePayrollProfileSchema = z.object({
    basicSalary: z.coerce.number().optional(),
    hra: z.coerce.number().optional(),
    allowances: z.coerce.number().optional(),
    annualCTC: z.coerce.number().optional(),
    bankAccountNumber: z.string().optional(),
    taxRegime: z.string().optional(),
    salary_structure: z.object({
        basic_salary: z.coerce.number().optional(),
        hra: z.coerce.number().optional(),
        allowances: z.coerce.number().optional(),
    }).optional()
}).passthrough();

export const processPayrollSchema = z.object({
    month: z.union([z.string(), z.number()]),
    year: z.union([z.string(), z.number()])
});
