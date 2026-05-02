import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './config/db';
import { initDb } from './initDb';
import { initializeDatabase } from './db/schema';
import { runMigrationV3 } from './db/migration_v3';

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
import auditRoutes from './routes/auditRoutes';
import notificationRoutes from './routes/notificationRoutes';
import performanceRoutes from './routes/performanceRoutes';
import documentRoutes from './routes/documentRoutes';
import settingsRoutes from './routes/settingsRoutes';
import organizationRoutes from './routes/organizationRoutes';
import governanceRoutes from './routes/governanceRoutes';
import realtimeRoutes from './routes/realtimeRoutes';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const port = process.env.PORT || 4000;

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────

// CORS — Allow frontend origins
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:3000',
            'https://ozofi-homie.vercel.app'
        ];
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serving static files
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// ─── API ROUTES ─────────────────────────────────────────────────────────────

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
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/performance', performanceRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/organization', organizationRoutes);
app.use('/api/v1/governance', governanceRoutes);
app.use('/api/v1/realtime', realtimeRoutes);


// Health check
app.get('/api/v1/health', (_req, res) => {
    res.json({
        success: true,
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// Root path handler
app.get('/', (_req, res) => {
    res.send('EMS Backend API is running.');
});

// ─── ERROR HANDLING ─────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── SERVER LIFECYCLE ───────────────────────────────────────────────────────

const start = async () => {
    // ── Start HTTP server immediately (only if not in Vercel) ────────────────
    if (process.env.VERCEL) {
        console.log('☁️ Running in Vercel Serverless environment');
    } else {
        activeServer = app.listen(port, () => {
            console.log(`
    🚀 ===================================================
       EMS BACKEND — SERVER STARTED
       PORT: ${port}
       ENV:  ${process.env.NODE_ENV || 'development'}
       DATE: ${new Date().toLocaleString()}
       ===================================================
            `);
        });
    }

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async () => {
        console.log('\n🛑 Shutting down server...');
        if (activeServer) {
            activeServer.close(async () => {
                console.log('💤 HTTP server closed.');
                await pool.end();
                console.log('🔌 Database connection closed.');
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    // ── Run schema migrations in background ──────────────────────────────────
    try {
        const res = await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connected:', res.rows[0].now);
        
        // Migrations
        await initDb();
        await initializeDatabase();
        await runMigrationV3();
        console.log('✅ All schema migrations completed.');
    } catch (dbErr: any) {
        console.error('\n❌ CRITICAL: Database Connection Failed');
        console.error('   Error Details:', dbErr);
        console.error('   Hint:  Check your DATABASE_URL, network firewall (port 5432/6543), and password encoding.\n');
    }
};

let activeServer: any;
start();

export default app;
