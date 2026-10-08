// ============================================================================
// EMS BACKEND — EXPRESS APP (construction only)
// ============================================================================
// Builds and exports the Express app with no side effects: no listen, no DB
// query, no seeding, no event registration, no process handlers. Those stay in
// index.ts so tests can import the app without starting the server.
// ============================================================================

import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import { BRAND } from './config/brand';
// Loaded before route modules to preserve the original evaluation order
// (config/db runs dotenv.config()).
import './config/db';

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
import workspaceRoutes from './modules/workspace/workspace.routes';
import { globalErrorHandler, notFoundHandler } from './core/errors/errorHandler';
import { requestIdMiddleware } from './core/observability/requestId';

const app = express();

// ─── REQUEST OBSERVABILITY & TRACING ─────────────────────────────────────────
app.use(requestIdMiddleware);

import { authLimiter, apiLimiter } from './middleware/rateLimiter';
export { authLimiter, apiLimiter };

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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'x-request-id']
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

// Auth routes (general limiter by default; strict authLimiter applied per-route inside authRoutes)
app.use('/api/v1/auth', apiLimiter, authRoutes);

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
app.use('/api/v1/workspace', apiLimiter, workspaceRoutes);

// Root path handler
app.get('/', (_req, res) => {
    res.send(`${BRAND.productName} API is running.`);
});

// ─── ERROR HANDLING ─────────────────────────────────────────────────────────

app.use(notFoundHandler);
// Reports 5xx errors to Sentry when it was initialised (instrument.ts), then
// passes the error on unchanged; responses are still produced by globalErrorHandler.
if (Sentry.isInitialized()) Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

export default app;
