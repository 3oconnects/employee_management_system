import { Router } from 'express';
import { getPermissions, getRoles, getRoleMembers, getRoleCandidates, createRole, updateRole, deleteRole, updateRolePermissions } from './rbac.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';
import { authorize } from '../../../core/security/authorize';

const router = Router();

router.get('/permissions', asyncHandler(getPermissions));
router.get('/roles', asyncHandler(getRoles));
router.get('/roles/:id/members', authorize(['roles:assign', 'roles:manage', 'users:manage']), asyncHandler(getRoleMembers));
router.get('/roles/:id/candidates', authorize(['roles:assign']), asyncHandler(getRoleCandidates));
router.post('/roles', authorize(['roles:manage']), asyncHandler(createRole));
router.put('/roles/:id', authorize(['roles:manage']), asyncHandler(updateRole));
router.delete('/roles/:id', authorize(['roles:manage']), asyncHandler(deleteRole));
router.put('/roles/:id/permissions', authorize(['permissions:grant']), asyncHandler(updateRolePermissions));

export default router;
