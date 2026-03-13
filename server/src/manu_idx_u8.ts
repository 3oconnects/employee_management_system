import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { pool } from "./config/db";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());

/* ROUTES */

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`≡ƒÜÇ Server running at http://localhost:${PORT}`);
});

/* DATABASE TEST */

pool.query("SELECT NOW()", (err, res) => {

  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("PostgreSQL connected:", res.rows[0]);
  }

});
