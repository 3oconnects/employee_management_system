import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { assertDisposableTestDatabase } from './db-guard';
import { seedTenantWithRoles } from './seed';
import { rebuildPublicSchemaFromSnapshot, snapshotExists } from '../../db/baseline/loadSnapshot';

// ============================================================================
// Integration global setup (Release 0 — B0-03)
// ============================================================================
// Builds a clean test database from the production schema baseline
// (server/db/baseline/0000_live_schema.sql, produced by B0-01). The repo's
// legacy schema scripts (initDb.ts, db/schema.ts, ...) are deliberately NOT
// used: they do not describe the production schema (baseline §0.2).
// ============================================================================

export default async function setup(project: TestProject): Promise<void> {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) {
        console.warn('[integration] TEST_DATABASE_URL not set — integration tests will be skipped.');
        project.provide('seededUsers', {});
        return;
    }

    assertDisposableTestDatabase(url);

    if (!snapshotExists()) {
        throw new Error(
            'BLOCKED (B0-01): server/db/baseline/0000_live_schema.sql does not exist yet. ' +
            'Integration tests need the production schema baseline. See server/db/baseline/README.md.'
        );
    }

    const client = new pg.Client({ connectionString: url, ssl: false });
    await client.connect();
    try {
        await rebuildPublicSchemaFromSnapshot(client);
        // Seed once for the whole run; test files read the users via inject().
        project.provide('seededUsers', await seedTenantWithRoles(client));
    } finally {
        await client.end();
    }
}
