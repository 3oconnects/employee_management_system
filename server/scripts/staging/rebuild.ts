// ============================================================================
// Staging rebuild (Release 0 — B0-05)
// ============================================================================
// Rebuilds the staging database ONLY from the production schema baseline and
// seeds synthetic data. A failed rebuild means the B0-01 snapshot is
// incomplete: fix the snapshot, never patch staging by hand.
//
// Usage (from server/):
//   STAGING_DB_URL=... STAGING_SEED_PASSWORD=... \
//   npx tsx scripts/staging/rebuild.ts --i-understand-this-destroys-staging
// ============================================================================

import pg from 'pg';
import { assertSafeStagingTarget, requireEnv } from './guard';
import { rebuildPublicSchemaFromSnapshot, snapshotExists } from '../../db/baseline/loadSnapshot';
import { seedStaging } from './seed';

async function main(): Promise<void> {
    const url = requireEnv('STAGING_DB_URL');
    const password = requireEnv('STAGING_SEED_PASSWORD');
    if (password.length < 12) throw new Error('STAGING_SEED_PASSWORD must be at least 12 characters.');
    if (!snapshotExists()) {
        throw new Error('BLOCKED (B0-01): server/db/baseline/0000_live_schema.sql does not exist yet.');
    }

    const ssl = /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false };
    const client = new pg.Client({ connectionString: url, ssl });
    await client.connect();
    try {
        await assertSafeStagingTarget(url, client);

        console.log('[staging] Rebuilding public schema from 0000_live_schema.sql ...');
        await rebuildPublicSchemaFromSnapshot(client);
        const t = await client.query(
            `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        console.log(`[staging] Schema rebuilt: ${t.rows[0].n} tables.`);

        console.log('[staging] Seeding synthetic data ...');
        const { users, report } = await seedStaging(client, password);
        console.log('\n| Step | Status | Detail |\n|---|---|---|');
        for (const r of report) console.log(`| ${r.step} | ${r.status} | ${r.detail} |`);
        console.log('\nSeeded logins (password = STAGING_SEED_PASSWORD):');
        for (const u of Object.values(users)) console.log(`  ${u.key.padEnd(12)} ${u.email}  (role: ${u.roleName})`);
        console.log('\n[staging] REBUILD OK');
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(`[staging] REBUILD FAILED: ${err.message}`);
    process.exit(1);
});
