import express from 'express';
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeamStatus
} from '../controllers/organizationController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Apply auth to all organization routes
router.use(authenticate);
const adminOnly = authorize(['admin', 'super_admin']);

// Team Status
router.get('/team-status', getTeamStatus);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', adminOnly, createDepartment);
router.put('/departments/:id', adminOnly, updateDepartment);
router.delete('/departments/:id', adminOnly, deleteDepartment);

// Teams
router.get('/teams', getTeams);
router.post('/teams', adminOnly, createTeam);
router.put('/teams/:id', adminOnly, updateTeam);
router.delete('/teams/:id', adminOnly, deleteTeam);

export default router;
