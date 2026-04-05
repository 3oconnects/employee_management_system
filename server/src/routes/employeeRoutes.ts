import express from 'express';
import { 
    getEmployees, 
    createEmployee, 
    bulkUpload,
    updateEmployee
} from '../controllers/employeeController';

const router = express.Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.post('/bulk-upload', bulkUpload);


export default router;
