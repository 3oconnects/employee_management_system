import { Router } from 'express';
import rbacRoutes from './rbac/rbac.routes';
import configRoutes from './configuration/configuration.routes';
import userRoutes from './user-assignments/user-assignments.routes';
import { authenticate, authorize } from '../../core/security/authorize';

const router = Router();

router.use(authenticate);
// Any role with settings:manage permission passes; super_admin always passes
router.use(authorize(['admin', 'super_admin', 'hr', 'settings:manage']));

router.use('/', rbacRoutes);
router.use('/', configRoutes);
router.use('/', userRoutes);

export default router;
