import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { pool } from './config/db';
import { seedPermissionsAndSuperAdmin } from './scripts/seedPermissions';


// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import leaveRoutes from './modules/leaves/leaves.routes';
import timesheetRoutes from './modules/timesheets/timesheets.routes';
import employeeRoutes from './modules/employees/employees.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import reportRoutes from './modules/reports/reports.routes';
import claimRoutes from './modules/claims/claims.routes';
import approvalRoutes from './modules/approvals/approvals.routes';
import auditRoutes from './modules/audit';
import notificationRoutes from './modules/notifications';
import performanceRoutes from './modules/performance';
import documentRoutes from './modules/documents/documents.routes';
import settingsRoutes from './modules/settings';
import organizationRoutes from './modules/organization/organization.routes';
import governanceRoutes from './modules/governance';
import realtimeRoutes from './modules/realtime';
import { globalErrorHandler, notFoundHandler } from './core/errors/errorHandler';
import { registerDomainEvents } from './core/events/registry';

const app = express();
const port = process.env.PORT || 4000;

// ─── RATE LIMITERS ──────────────────────────────────────────────────────────

// Strict limiter for auth endpoints (login / refresh) — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,   // Return RateLimit-* headers
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

// General API limiter — 300 requests per minute per IP (generous for normal use)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});

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

// ─── HEALTH CHECK (no rate limit) ───────────────────────────────────────────

app.get('/api/v1/health', (_req, res) => {
    res.json({
        success: true,
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
});

// ─── API ROUTES ─────────────────────────────────────────────────────────────

// Auth routes get the strict limiter
app.use('/api/v1/auth', authLimiter, authRoutes);

// All other API routes get the general limiter
app.use('/api/v1/users', apiLimiter, userRoutes);
app.use('/api/v1/attendance', apiLimiter, attendanceRoutes);
app.use('/api/v1/leave', apiLimiter, leaveRoutes);
app.use('/api/v1/timesheets', apiLimiter, timesheetRoutes);
app.use('/api/v1/employees', apiLimiter, employeeRoutes);
app.use('/api/v1/payroll', apiLimiter, payrollRoutes);
app.use('/api/v1/reports', apiLimiter, reportRoutes);
app.use('/api/v1/claims', apiLimiter, claimRoutes);
app.use('/api/v1/approvals', apiLimiter, approvalRoutes);
app.use('/api/v1/audit-logs', apiLimiter, auditRoutes);
app.use('/api/v1/notifications', apiLimiter, notificationRoutes);
app.use('/api/v1/performance', apiLimiter, performanceRoutes);
app.use('/api/v1/documents', apiLimiter, documentRoutes);
app.use('/api/v1/settings', apiLimiter, settingsRoutes);
app.use('/api/v1/organization', apiLimiter, organizationRoutes);
app.use('/api/v1/governance', apiLimiter, governanceRoutes);
app.use('/api/v1/realtime', apiLimiter, realtimeRoutes);

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
        registerDomainEvents();
        console.log('☁️ Running in Vercel Serverless environment');
    } else {
        registerDomainEvents();
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
        
        console.log('ℹ️ Automatic schema migrations are disabled. Run npm run db:setup to migrate/seed.');

        // ── Seed permissions & fix super-admin role on every startup ─────────
        await seedPermissionsAndSuperAdmin();
    } catch (dbErr: any) {
        console.error('\n❌ CRITICAL: Database Connection Failed');
        console.error('   Error Details:', dbErr);
        console.error('   Hint:  Check your DATABASE_URL, network firewall (port 5432/6543), and password encoding.\n');
    }
};

let activeServer: any;
start();

export default app;
