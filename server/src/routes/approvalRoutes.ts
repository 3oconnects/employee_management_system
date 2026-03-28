import express from 'express';
import { 
    getPendingApprovals, 
    createApprovalRequest, 
    updateApprovalAction 
} from '../controllers/approvalController';

const router = express.Router();

router.get('/pending', getPendingApprovals);
router.post('/', createApprovalRequest);
router.put('/:id/:action', updateApprovalAction);

export default router;
