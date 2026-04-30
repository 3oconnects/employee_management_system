import express from 'express';
import { 
    getApprovals, 
    createApprovalRequest, 
    updateApprovalAction 
} from '../controllers/approvalController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authenticate, getApprovals);
router.post('/', authenticate, createApprovalRequest);
router.post('/:id/action', authenticate, updateApprovalAction);

export default router;
