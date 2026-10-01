const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const fks = await pool.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'employees';
  `);
  console.log('FKs referencing employees:');
  console.table(fks.rows);

  const empCols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'employees'
    ORDER BY ordinal_position;
  `);
  console.log('\nEmployees table columns:');
  console.table(empCols.rows);

  await pool.end();
}

run().catch(console.error);
