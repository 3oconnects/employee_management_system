import express from 'express';
import { 
    getEmployees, 
    createEmployee, 
    bulkUpload 
} from '../controllers/employeeController';

const router = express.Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.post('/bulk-upload', bulkUpload);

export default router;
