import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

// Force Node.js to prioritize IPv4 DNS lookups over IPv6 NAT64 addresses (which cause ENOTFOUND/timeout on some networks)
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // ignore on older node versions
}

dotenv.config();

// NOTE: TLS verification is disabled per-pool via ssl.rejectUnauthorized=false
// (scoped to Supabase connections only). The global NODE_TLS_REJECT_UNAUTHORIZED
// override has been removed — it was disabling TLS for ALL outbound HTTPS calls
// made by this process (e.g. third-party APIs, webhooks).

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('sslmode=disable') || process.env.DB_SSL_DISABLE === 'true';

export const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 25000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const isDirectLocal = directUrl.includes('localhost') || directUrl.includes('127.0.0.1') || directUrl.includes('sslmode=disable') || process.env.DB_SSL_DISABLE === 'true';

export const directPool = new Pool({
    connectionString: directUrl,
    ssl: isDirectLocal ? false : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 25000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err: any) => {
    console.warn('⚠️ [DB Pool] Idle client error safely caught:', err.message);
});

pool.on('connect', (client: any) => {
    client.on('error', (err: any) => {
        console.warn('⚠️ [DB Client] Socket error safely handled:', err.message);
    });
});

directPool.on('error', (err: any) => {
    console.warn('⚠️ [DB DirectPool] Idle client error safely caught:', err.message);
});

directPool.on('connect', (client: any) => {
    client.on('error', (err: any) => {
        console.warn('⚠️ [DB DirectClient] Socket error safely handled:', err.message);
    });
});

export const query = async (text: string, params?: any[]) => {
    try {
        return await pool.query(text, params);
    } catch (err: any) {
        if (
            err?.message?.includes('Connection terminated') ||
            err?.code === 'ECONNRESET' ||
            err?.code === 'EPIPE' ||
            err?.message?.includes('timeout')
        ) {
            console.warn('⚠️ [DB Query] Transient connection drop detected, retrying query once...');
            await new Promise(r => setTimeout(r, 300));
            return await pool.query(text, params);
        }
        throw err;
    }
};

