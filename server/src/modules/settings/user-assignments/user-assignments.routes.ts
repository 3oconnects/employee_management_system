import { Router } from 'express';
import { getUsers, createUser, sendWelcome, resetPassword, updatePassword, updateUserRole, updateUserStatus, deleteUser } from './user-assignments.controller';
import { asyncHandler } from '../../../core/errors/asyncHandler';
import { authorize } from '../../../core/security/authorize';

const router = Router();

router.get('/users', asyncHandler(getUsers));
router.post('/users', authorize(['users:manage']), asyncHandler(createUser));
router.post('/users/:id/send-welcome', authorize(['users:manage']), asyncHandler(sendWelcome));
router.post('/users/:id/reset-password', authorize(['users:manage']), asyncHandler(resetPassword));
router.put('/users/:id/password', authorize(['users:manage']), asyncHandler(updatePassword));
router.put('/users/:id/role', authorize(['roles:assign']), asyncHandler(updateUserRole));
router.put('/users/:id/status', authorize(['users:manage']), asyncHandler(updateUserStatus));
router.delete('/users/:id', authorize(['users:manage']), asyncHandler(deleteUser));

export default router;
