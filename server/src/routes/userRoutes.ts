import express from "express";
import { pool } from "../config/db";

const router = express.Router();

/* UPDATE PROFILE */

router.put("/profile", async (req, res) => {

  const { id, name, email, phone, address, emergency } = req.body;

  try {

    const result = await pool.query(
      `UPDATE users
       SET name=$1,
           email=$2,
           phone=$3,
           address=$4,
           emergency=$5
       WHERE id=$6
       RETURNING id,name,email,role,phone,address,emergency`,
      [name, email, phone, address, emergency, id]
    );

    res.json({
      message: "Profile updated",
      user: result.rows[0]
    });

  } catch (err) {

    console.error("Profile update error:", err);

    res.status(500).json({
      message: "Failed to update profile"
    });

  }

});

export default router;