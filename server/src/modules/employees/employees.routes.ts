import { Router } from 'express';
import { getEmployees, createEmployee, updateEmployee, bulkUpload } from './employees.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { createEmployeeSchema, updateEmployeeSchema, bulkUploadSchema } from './employees.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);

// List employees — any authenticated user with read access
router.get('/', authorize(['admin', 'super_admin', 'hr', 'manager', 'employee', 'employees:read', 'employees:manage']), asyncHandler(getEmployees));

// Create employee
router.post('/', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), validateRequest(createEmployeeSchema, 'body'), asyncHandler(createEmployee));

// Update employee
router.put('/:id', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), validateRequest(updateEmployeeSchema, 'body'), asyncHandler(updateEmployee));

// Bulk upload
router.post('/bulk-upload', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), validateRequest(bulkUploadSchema, 'body'), asyncHandler(bulkUpload));

export default router;
