import { pool } from '../src/config/db';

async function main() {
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;');
    console.log('✅ avatar_url column added to employees and users successfully!');
    process.exit(0);
}

main().catch(err => {
    console.error('Failed to add column:', err);
    process.exit(1);
});
