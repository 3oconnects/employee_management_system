import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Unified DB reference
import { pool } from './config/db';
import { initializeDatabase } from './db/schema';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import leaveRoutes from './routes/leaveRoutes';
import timesheetRoutes from './routes/timesheetRoutes';
import employeeRoutes from './routes/employeeRoutes';
import payrollRoutes from './routes/payrollRoutes';
import reportRoutes from './routes/reportRoutes';
import claimRoutes from './routes/claimRoutes';
import approvalRoutes from './routes/approvalRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true
}));
app.use(express.json());

// Serving static files
app.use('/public', express.static(path.join(process.cwd(), 'public')));

/* ROUTES */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leave', leaveRoutes);
app.use('/api/v1/timesheets', timesheetRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/claims', claimRoutes);
app.use('/api/v1/approvals', approvalRoutes);

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const start = async () => {
    try {
        await initializeDatabase();
        
        app.listen(port, () => {
            console.log(`🚀 Unified EMS Server running at http://localhost:${port}`);
        });

        const res = await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected:", res.rows[0]);

    } catch (err) {
        console.error('❌ Failed to start server:', err);
    }
};

start();
