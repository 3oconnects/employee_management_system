import fs from 'fs';
import path from 'path';
import readline from 'readline';
import dotenv from 'dotenv';
import pg from 'pg';

// ============================================================================
// Staging safety guard (Release 0 — B0-05)
// ============================================================================
// The staging rebuild DROPS the public schema. Before it runs, every check here
// must pass. Connection strings are never printed.
// ============================================================================

export const STAGING_EMAIL_DOMAIN = 'ems-staging.example.test';
export const CONFIRM_FLAG = '--i-understand-this-destroys-staging';

const normalize = (u?: string) => (u || '').trim().replace(/\/+$/, '');

export function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} is not set.`);
    return v;
}

export async function assertSafeStagingTarget(url: string, client: pg.Client): Promise<void> {
    // 1. Never the database the app is configured to use locally (server/.env).
    const envFile = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envFile)) {
        const appEnv = dotenv.parse(fs.readFileSync(envFile));
        if ([appEnv.DATABASE_URL, appEnv.DIRECT_URL].some((u) => u && normalize(u) === normalize(url))) {
            throw new Error('Refusing: STAGING_DB_URL matches DATABASE_URL/DIRECT_URL in server/.env.');
        }
    }

    // 2. Any existing users must all be synthetic staging users.
    const hasUsers = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`
    );
    if (hasUsers.rowCount) {
        const real = await client.query(
            `SELECT count(*)::int AS n FROM public.users WHERE lower(email) NOT LIKE $1`,
            [`%@${STAGING_EMAIL_DOMAIN}`]
        );
        if (real.rows[0].n > 0) {
            throw new Error(
                `Refusing: target contains ${real.rows[0].n} user(s) outside @${STAGING_EMAIL_DOMAIN}. ` +
                'This does not look like a staging database.'
            );
        }
    }

    // 3. Explicit flag + typed confirmation of the host.
    if (!process.argv.includes(CONFIRM_FLAG)) {
        throw new Error(`Refusing: pass ${CONFIRM_FLAG} to confirm the staging schema may be dropped.`);
    }
    const host = new URL(url).hostname;
    if (process.env.STAGING_CONFIRM_HOST === host) return; // non-interactive (CI) confirmation
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer: string = await new Promise((res) =>
        rl.question('Type the staging database HOST to confirm (shown in your Supabase dashboard): ', res)
    );
    rl.close();
    if (answer.trim() !== host) throw new Error('Refusing: host confirmation did not match.');
}
