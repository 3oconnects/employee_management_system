import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// NOTE: TLS verification is disabled per-pool via ssl.rejectUnauthorized=false
// (scoped to Supabase connections only). The global NODE_TLS_REJECT_UNAUTHORIZED
// override has been removed — it was disabling TLS for ALL outbound HTTPS calls
// made by this process (e.g. third-party APIs, webhooks).

const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

export const directPool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
