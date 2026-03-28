import express from 'express';
import { 
    submitClaim, 
    getEmployeeClaims, 
    getAllClaims, 
    updateClaimStatus 
} from '../controllers/claimController';

const router = express.Router();

router.post('/', submitClaim);
router.get('/employee/:employeeId', getEmployeeClaims);
router.get('/admin', getAllClaims);
router.put('/:id', updateClaimStatus);

export default router;
