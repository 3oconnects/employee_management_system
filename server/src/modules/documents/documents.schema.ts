import { z } from 'zod';

export const uploadDocumentSchema = z.object({
    employeeId: z.union([z.string(), z.number()]),
    documentType: z.string(),
    documentName: z.string(),
    filePath: z.string().optional(),
    fileSize: z.number().optional(),
    expiresAt: z.string().optional().nullable()
});

export const verifyDocumentSchema = z.object({
    verified: z.boolean()
});
