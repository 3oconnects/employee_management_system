import { z } from 'zod';

export const createEmployeeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().nullable(),
    annualCTC: z.coerce.number().min(0, 'CTC must be positive'),
    department: z.string().min(1, 'Department is required'),
    position: z.string().optional(),
    joinDate: z.string().min(1, 'Join date is required'),
    status: z.string().optional(),
    phone: z.string().optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    personalEmail: z.string().email().optional().nullable(),
    addressLine1: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pincode: z.string().optional().nullable(),
    employmentType: z.string().optional(),
    reportingManagerId: z.coerce.number().optional().nullable(),
    departmentId: z.coerce.number().optional().nullable(),
    department_id: z.coerce.number().optional().nullable(),
    team_id: z.coerce.number().optional().nullable(),
    probationEndDate: z.string().optional().nullable(),
    highestDegree: z.string().optional().nullable(),
    fieldOfStudy: z.string().optional().nullable(),
    institution: z.string().optional().nullable(),
    graduationYear: z.string().optional().nullable(),
    educationHistory: z.array(z.any()).optional(),
    experienceHistory: z.array(z.any()).optional(),
    internshipStartDate: z.string().optional().nullable(),
    internshipEndDate: z.string().optional().nullable(),
    internshipStipend: z.coerce.number().optional().nullable(),
    internshipSupervisor: z.string().optional().nullable(),
    internshipCollege: z.string().optional().nullable(),
}).passthrough(); // allows other fields just in case

export const updateEmployeeSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    annualCTC: z.coerce.number().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    status: z.string().optional()
}).passthrough();

export const bulkUploadSchema = z.object({
    employees: z.array(z.any()).min(1, 'Send { employees: [] } with at least one row.')
});
