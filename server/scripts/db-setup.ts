import { pool } from '../src/config/db';
import { initDb } from '../src/initDb';
import { initializeDatabase } from '../src/db/schema';
import { runMigrationV3 } from '../src/db/migration_v3';

const run = async () => {
    try {
        console.log('🔄 Connecting to database...');
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Connected:', res.rows[0].now);

        console.log('🔄 Running initial schema setup (initDb)...');
        await initDb();
        
        console.log('🔄 Running extended schema setup (initializeDatabase)...');
        await initializeDatabase();
        
        console.log('🔄 Running migrations (runMigrationV3)...');
        await runMigrationV3();

        console.log('✅ Database setup completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Database setup failed:', err);
        process.exit(1);
    }
};

run();
