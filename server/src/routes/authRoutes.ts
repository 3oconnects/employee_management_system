import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from '../config/db';

const router = express.Router();

const JWT_SECRET = "ems_secret";

/* LOGIN */

router.post("/login", async (req, res) => {

  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);

  try {

    const result = await pool.query(
      "SELECT u.*, e.id as employee_id FROM users u LEFT JOIN employees e ON u.email = e.email WHERE u.email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Also return as 'token' for backward compat with any direct fetch calls
    res.json({
      accessToken,
      token: accessToken,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        emergency: user.emergency || ''
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({ message: "Server error" });

  }

});

/* REFRESH - Re-issues token using existing Authorization header */
router.post("/refresh", async (req, res) => {
  // Since we're using long-lived JWTs for simplicity, just re-verify and re-issue
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, role: decoded.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({ accessToken: newToken });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
