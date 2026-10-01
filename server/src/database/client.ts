import pg from 'pg';
import dotenv from 'dotenv';
import dns from 'dns';

try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || '';
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('sslmode=disable') || process.env.DB_SSL_DISABLE === 'true';

export const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 15000,
    connectionTimeoutMillis: 10000,
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

export const query = (text: string, params?: any[]) => pool.query(text, params);

