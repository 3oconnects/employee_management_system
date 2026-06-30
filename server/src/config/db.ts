import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// NOTE: TLS verification is disabled per-pool via ssl.rejectUnauthorized=false
// (scoped to Supabase connections only). The global NODE_TLS_REJECT_UNAUTHORIZED
// override has been removed — it was disabling TLS for ALL outbound HTTPS calls
// made by this process (e.g. third-party APIs, webhooks).

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');

export const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const isDirectLocal = directUrl.includes('localhost') || directUrl.includes('127.0.0.1');

export const directPool = new Pool({
    connectionString: directUrl,
    ssl: isDirectLocal ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
