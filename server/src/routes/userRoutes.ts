import express from "express";
import { updateProfile, getUsers } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

/* GET USERS */
router.get("/", authenticate, getUsers);

/* UPDATE PROFILE */
router.put("/profile", authenticate, updateProfile);

export default router;

