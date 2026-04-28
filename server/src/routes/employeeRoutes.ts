import express from 'express';
import { 
    getEmployees, 
    createEmployee, 
    bulkUpload,
    updateEmployee
} from '../controllers/employeeController';
import {
    getEducation, upsertEducation,
    getExperience, upsertExperience
} from '../controllers/educationExperienceController';

const router = express.Router();

router.get('/', getEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.post('/bulk-upload', bulkUpload);

// Education & Experience (proper relational tables)
router.get('/:id/education',  getEducation);
router.put('/:id/education',  upsertEducation);
router.get('/:id/experience', getExperience);
router.put('/:id/experience', upsertExperience);

export default router;
