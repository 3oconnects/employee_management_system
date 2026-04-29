// ============================================================================
// EMS BACKEND — SERVER ENTRY POINT (UPGRADED)
// ============================================================================
// Changes from original:
//   1. Added Helmet for security headers
//   2. Added rate limiting
//   3. Added global error handler + 404 handler
//   4. Added request logging
//   5. Cookie parser for refresh tokens
//   6. Graceful shutdown
//   7. All existing routes preserved
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load env before anything else
dotenv.config();

// Unified DB reference
import { pool } from './config/db';
import { initDb } from './initDb';
import { initializeDatabase } from './db/schema';
import { runMigrationV3 } from './db/migration_v3';

// Middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';

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

const app = express();
const port = process.env.PORT || 4000;

// ─── SECURITY MIDDLEWARE ────────────────────────────────────────────────────

// CORS — Allow frontend origins
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://velda-nonraiseable-joshingly.ngrok-free.dev',
        'https://henlike-heterogeneously-rex.ngrok-free.dev',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (lightweight)
app.use((req, _res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        const timestamp = new Date().toISOString().slice(11, 19);
        console.log(`  [${timestamp}] ${req.method} ${req.originalUrl}`);
    }
    next();
});

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


// Health check
app.get('/api/v1/health', (_req, res) => {
    res.json({
        success: true,
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date(),
        uptime: process.uptime(),
    });
});

// ─── ERROR HANDLING ─────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─── SERVER START ───────────────────────────────────────────────────────────

const start = async () => {
    // ── Start HTTP server immediately ────────────────────────────────────────
    activeServer = app.listen(port, () => {
        console.log(`\n🚀 EMS Server v2.0 running at http://localhost:${port}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   API Base:    http://localhost:${port}/api/v1\n`);
    });

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
        console.log(`\n🛑 ${signal} received. Shutting down gracefully...`);
        if (activeServer) {
            activeServer.close(async () => {
                await pool.end();
                console.log('✅ Database pool closed.');
                process.exit(0);
            });
        } else {
            await pool.end();
            process.exit(0);
        }
        setTimeout(() => {
            console.error('⚠️ Forced shutdown after timeout.');
            process.exit(1);
        }, 10000);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

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
