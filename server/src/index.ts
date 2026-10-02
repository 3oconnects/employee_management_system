// Error monitoring must initialise before any other module loads (B0-04).
import './instrument';
import dotenv from 'dotenv';
import { pool } from './config/db';
import { seedPermissionsAndSuperAdmin } from './scripts/seedPermissions';
// The Express app is built in app.ts (no side effects). This file owns startup:
// event registration, listen, DB check, permission seeding, process handlers.
import app from './app';
import { registerDomainEvents } from './core/events/registry';

const port = process.env.PORT || 4000;

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

    // Prevent sudden process exits on transient PostgreSQL socket drops / ECONNRESET
    process.on('uncaughtException', (err: any) => {
        if (
            err?.message?.includes('Connection terminated') ||
            err?.code === 'ECONNRESET' ||
            err?.code === 'EPIPE' ||
            err?.code === 'ETIMEDOUT'
        ) {
            console.warn('⚠️ [Process] Safely handled transient socket disconnect:', err.message);
            return;
        }
        console.error('💥 [Process] Uncaught Exception:', err);
    });

    process.on('unhandledRejection', (reason: any) => {
        console.warn('⚠️ [Process] Unhandled Rejection:', reason?.message || reason);
    });

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
