import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Supabase uses self-signed intermediate cert — bypass TLS verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// For migrations: prefer DIRECT_URL (port 5432) but fall back to pooler (port 6543)
// Port 5432 may be blocked on some networks — pooler is more reliable
export const directPool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);


