import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Test connection on import
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Convenience wrapper around pool.query
 */
export const query = (text: string, params?: any[]) => {
    return pool.query(text, params);
};

export default pool;
