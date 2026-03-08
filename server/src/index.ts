import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db";



dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const JWT_SECRET = "ems_secret";

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("PostgreSQL connected:", res.rows[0]);
  }
});

/* ================= REGISTER ================= */

app.post("/api/v1/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users(name,email,password)
       VALUES($1,$2,$3)
       RETURNING id,name,email,role`,
      [name, email, hashedPassword]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= LOGIN ================= */

app.post("/api/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
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

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const permissions =
      user.role === "admin"
        ? [
            "dashboard:view",
            "employee:view",
            "employee:create",
            "leave:apply",
            "payroll:generate",
            "reports:view",
          ]
        : ["dashboard:view", "leave:apply"];

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= EXISTING MOCK ROUTES ================= */

app.get("/api/v1/dashboard/stats", (req, res) => {
  res.json({
    totalEmployees: 1248,
    avgAttendance: 94,
    onLeave: 14,
    openPositions: 8,
  });
});

app.get("/api/v1/attendance/today", (req, res) => {
  res.json({ status: "OUT" });
});

app.get("/api/v1/employees", (req, res) => {
  res.json({
    items: [],
    totalPages: 1,
    totalItems: 0,
  });
});

app.post("/api/v1/attendance/check-in", (req, res) => {
  res.json({ status: "IN", checkInTime: new Date().toISOString() });
});

app.post("/api/v1/attendance/check-out", (req, res) => {
  res.json({ status: "COMPLETED" });
});

app.post("/api/v1/leave/apply", (req, res) => {
  res.status(201).json({ message: "Leave application submitted" });
});

app.post("/api/v1/payroll/generate", (req, res) => {
  setTimeout(() => {
    res.json({ message: "Payroll generated" });
  }, 2000);
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});