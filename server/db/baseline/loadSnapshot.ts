import fs from 'fs';
import path from 'path';
import pg from 'pg';

// Shared loader for the production schema baseline (B0-01). Used by the
// integration test setup (B0-03) and the staging rebuild (B0-05).

export const SNAPSHOT_PATH = path.resolve(__dirname, '0000_live_schema.sql');

export function snapshotExists(): boolean {
    return fs.existsSync(SNAPSHOT_PATH);
}

/** Snapshot SQL without psql meta-commands (e.g. \restrict), which the pg driver cannot run. */
export function loadSnapshotSql(): string {
    return fs
        .readFileSync(SNAPSHOT_PATH, 'utf8')
        .split(/\r?\n/)
        .filter((line) => !line.startsWith('\\'))
        .join('\n');
}

/**
 * DESTRUCTIVE: drops the `public` schema of the connected database and rebuilds
 * it from the snapshot. Callers must have verified the target is disposable.
 */
export async function rebuildPublicSchemaFromSnapshot(client: pg.Client): Promise<void> {
    const snapshot = loadSnapshotSql();
    // Depending on the pg_dump version, the dump may or may not create the schema itself.
    const snapshotCreatesPublic = /^\s*CREATE SCHEMA (IF NOT EXISTS )?public\b/im.test(snapshot);
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    if (!snapshotCreatesPublic) await client.query('CREATE SCHEMA public;');
    await client.query(snapshot);
    // pg_dump output empties search_path for the session; restore it for callers.
    await client.query('RESET search_path;');
}
