import { Router } from 'express';
import { 
    getEmployees, 
    getMyProfile,
    createEmployee, 
    updateEmployee, 
    bulkUpload, 
    checkEmail,
    getEducation,
    saveEducation,
    getExperience,
    saveExperience,
    getEmergencyContacts,
    saveEmergencyContacts,
    deleteEmployee
} from './employees.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { createEmployeeSchema, updateEmployeeSchema, bulkUploadSchema } from './employees.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';
import { pool } from '../../config/db';

const router = Router();

router.use(authenticate);

// Check email availability & get 3 unique domain-based suggestions
router.get('/check-email', asyncHandler(checkEmail));

// Fetch available system roles for employee assignment
router.get('/roles', asyncHandler(async (req, res) => {
    const tenantId = (req as any).user?.tenantId || 'default';
    const result = await pool.query(
        `SELECT id, name, description, is_system, dashboard_type 
         FROM roles 
         WHERE tenant_id = $1 OR tenant_id IS NULL OR tenant_id = 'tenant_default' OR tenant_id = 'default'
         ORDER BY is_system DESC, name ASC`,
        [tenantId]
    );
    res.json({ success: true, data: result.rows });
}));

// Current employee's own full profile
router.get('/me', asyncHandler(getMyProfile));

// List employees — any authenticated user with read access
router.get('/', authorize(['admin', 'super_admin', 'hr', 'manager', 'employee', 'employees:read', 'employees:manage']), asyncHandler(getEmployees));

// Create employee
router.post('/', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), validateRequest(createEmployeeSchema, 'body'), asyncHandler(createEmployee));

// Education history
router.get('/:id/education', asyncHandler(getEducation));
router.put('/:id/education', asyncHandler(saveEducation));

// Work experience
router.get('/:id/experience', asyncHandler(getExperience));
router.put('/:id/experience', asyncHandler(saveExperience));

// Emergency contacts
router.get('/:id/emergency-contacts', asyncHandler(getEmergencyContacts));
router.post('/:id/emergency-contacts', asyncHandler(saveEmergencyContacts));

// Update employee (admin/hr or employee themselves for personal details)
router.put('/:id', validateRequest(updateEmployeeSchema, 'body'), asyncHandler(updateEmployee));

// Bulk upload
router.post('/bulk-upload', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), validateRequest(bulkUploadSchema, 'body'), asyncHandler(bulkUpload));

// Delete employee
router.delete('/:id', authorize(['admin', 'super_admin', 'hr', 'employees:manage']), asyncHandler(deleteEmployee));

export default router;
