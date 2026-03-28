import express from 'express';
import { 
    getLeaveTypes, 
    applyLeave, 
    getLeaveRequests, 
    approveLeave, 
    getLeaveBalance 
} from '../controllers/leaveController';

const router = express.Router();

router.get('/types', getLeaveTypes);
router.post('/apply', applyLeave);
router.get('/requests', getLeaveRequests);
router.put('/requests/:id/approve', approveLeave);
router.get('/balance', getLeaveBalance);

export default router;
