import { Request, Response } from "express";
import { updateUserProfile } from "../services/userService";
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../types';

export const updateProfile = async (req: Request, res: Response) => {

  try {

    const { id, name, email, phone, address, emergency } = req.body;

    const user = await updateUserProfile(
      id,
      name,
      email,
      phone,
      address,
      emergency
    );

    res.json({
      message: "Profile updated successfully",
      user
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to update profile"
    });

  }

};

/* GET ALL USERS (Filtered by Tenant) */
export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId || 'tenant_default';
        const { role } = req.query;

        // Using a more robust query that handles potential schema variations
        // Note: Removed 'phone' as it is managed in the 'employees' table join logic if needed
        let sql = 'SELECT id, name, email, role, COALESCE(is_active, true) as is_active FROM users WHERE tenant_id = $1';
        const params: any[] = [tenantId];

        if (role) {
            sql += ' AND role = $2';
            params.push(role);
        }

        sql += ' ORDER BY name ASC';

        const result = await pool.query(sql, params);
        res.json({ success: true, items: result.rows });
    } catch (err: any) {
        console.error('[USERS] Fetch Error:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch users', 
            error: err.message
        });
    }
};

