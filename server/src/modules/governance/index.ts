import { Router } from 'express';
import orgTreeRoutes from './org-tree/org-tree.routes';
import syncRoutes from './sync/sync.routes';
import sharedRoutes from './shared/shared.routes';

const router = Router();

router.use('/', orgTreeRoutes);
router.use('/', syncRoutes);
router.use('/', sharedRoutes);

export default router;
