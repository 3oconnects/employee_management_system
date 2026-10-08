// Local-only schema bootstrap (fallback while 0000_live_schema.sql is missing).
import { initializeDatabase } from '../../../../../server/src/db/schema';
import { runMigrationV3 } from '../../../../../server/src/db/migration_v3';
(async () => {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL || '')) throw new Error('SAFETY');
  await initializeDatabase(); await runMigrationV3(); console.log('SCHEMA OK'); process.exit(0);
})().catch((e) => { console.error('SCHEMA FAILED', e.message); process.exit(1); });
