import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getTeams, createTeam, updateTeam, deleteTeam, getTeamStatus } from './organization.controller';
import { authenticate, authorize } from '../../core/security/authorize';
import { validateRequest } from '../../core/validation/validateRequest';
import { createDepartmentSchema, updateDepartmentSchema, createTeamSchema, updateTeamSchema } from './organization.schema';
import { asyncHandler } from '../../core/errors/asyncHandler';

const router = Router();

router.use(authenticate);
const adminOnly = authorize(['admin', 'super_admin', 'organization:manage', 'employees:manage']);

router.get('/team-status', asyncHandler(getTeamStatus));

router.get('/departments', asyncHandler(getDepartments));
router.post('/departments', adminOnly, validateRequest(createDepartmentSchema, 'body'), asyncHandler(createDepartment));
router.put('/departments/:id', adminOnly, validateRequest(updateDepartmentSchema, 'body'), asyncHandler(updateDepartment));
router.delete('/departments/:id', adminOnly, asyncHandler(deleteDepartment));

router.get('/teams', asyncHandler(getTeams));
router.post('/teams', adminOnly, validateRequest(createTeamSchema, 'body'), asyncHandler(createTeam));
router.put('/teams/:id', adminOnly, validateRequest(updateTeamSchema, 'body'), asyncHandler(updateTeam));
router.delete('/teams/:id', adminOnly, asyncHandler(deleteTeam));

export default router;
