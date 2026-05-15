import { Router } from 'express';
import { getPermissions, getRoles, createRole, updateRole, deleteRole, updateRolePermissions } from './rbac.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';

const router = Router();

router.get('/permissions', asyncHandler(getPermissions));
router.get('/roles', asyncHandler(getRoles));
router.post('/roles', asyncHandler(createRole));
router.put('/roles/:id', asyncHandler(updateRole));
router.delete('/roles/:id', asyncHandler(deleteRole));
router.put('/roles/:id/permissions', asyncHandler(updateRolePermissions));

export default router;
