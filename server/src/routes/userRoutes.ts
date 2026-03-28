import express from "express";
import { updateProfile } from '../controllers/userController';

const router = express.Router();

/* UPDATE PROFILE */
router.put("/profile", updateProfile);

export default router;
