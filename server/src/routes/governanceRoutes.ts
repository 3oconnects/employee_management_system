import { Router } from 'express';
import * as GovernanceController from '../controllers/governanceController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();

// Secure all governance routes to admins/hr
router.use(authenticate);

router.get('/tree', GovernanceController.getOrgTree);
router.post('/sync', authorize(['admin', 'hr', 'super_admin']), GovernanceController.syncGraph);
router.get('/search', GovernanceController.searchNodes);
router.get('/resolve/:nodeId', GovernanceController.resolveOwnership);
router.put('/:nodeId', authorize(['admin', 'hr', 'super_admin']), GovernanceController.updateGovernance);

export default router;
