import { pool } from '../src/config/db';

async function migrate() {
    try {
        console.log('🔄 Adding offer acceptance columns to employees table...');
        await pool.query(`
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_token TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_accepted_at TIMESTAMP;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_accepted_date DATE;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_acceptance_notes TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_accepted_via TEXT;
            ALTER TABLE employees ADD COLUMN IF NOT EXISTS offer_token_expires_at TIMESTAMP;
            CREATE INDEX IF NOT EXISTS idx_employees_offer_token ON employees(offer_token);
        `);
        console.log('✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
