// Fallback seed when server/db/baseline/0000_live_schema.sql is missing: run initDb.ts first, then this.
import pg from 'pg';
import { seedStaging } from '../../../../../server/scripts/staging/seed';
(async () => {
  const url = process.env.E2E_LOCAL_DB_URL!;
  if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) throw new Error('SAFETY: local only');
  const c = new pg.Client({ connectionString: url, ssl: false });
  await c.connect();
  const { users, report } = await seedStaging(c, process.env.E2E_SEED_PASSWORD!);
  console.log(report.map((r) => `${r.step}|${r.status}|${r.detail}`).join('\n'));
  console.log(Object.values(users).map((u) => u.email).join('\n'));
  await c.end();
})().catch((e) => { console.error('SEED FAILED', e.message); process.exit(1); });
