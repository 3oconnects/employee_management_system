// ============================================================================
// Staging smoke run (Release 0 — B0-05)
// ============================================================================
// Exercises core flows against a deployed staging API and RECORDS the results.
// In Release 0 it asserts nothing about authorization (that is Release 1);
// it only records what happens so later releases can compare.
//
// Usage (from server/):
//   STAGING_API_URL=https://<staging-host>/api/v1 STAGING_SEED_PASSWORD=... \
//   npx tsx scripts/staging/smoke.ts [--out smoke-results.md]
// ============================================================================

import fs from 'fs';
import { STAGING_EMAIL_DOMAIN, requireEnv } from './guard';

type Row = { role: string; step: string; method: string; path: string; status: number | string; note: string };

const api = requireEnv('STAGING_API_URL').replace(/\/+$/, '');
const password = requireEnv('STAGING_SEED_PASSWORD');
const rows: Row[] = [];

async function call(role: string, step: string, method: string, path: string, token?: string, body?: unknown) {
    try {
        const res = await fetch(`${api}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: body ? JSON.stringify(body) : undefined,
        });
        let json: any = null;
        try { json = await res.json(); } catch { /* non-JSON response */ }
        rows.push({ role, step, method, path, status: res.status, note: (json?.message || '').slice(0, 80) });
        return { status: res.status, json };
    } catch (err: any) {
        rows.push({ role, step, method, path, status: 'ERR', note: err.message.slice(0, 80) });
        return { status: 0, json: null };
    }
}

async function main(): Promise<void> {
    await call('-', 'health', 'GET', '/health');

    // Every /auth/* request counts against the auth rate limiter (10 per 15 min
    // per IP, app.ts). This run uses 8: six logins + two profile reads.
    // Re-running within 15 minutes from the same IP will hit 429.
    const tokens: Record<string, string> = {};
    for (const role of ['super_admin', 'admin', 'hr', 'manager', 'employee', 'custom']) {
        const r = await call(role, 'login', 'POST', '/auth/login', undefined, { email: `${role}@${STAGING_EMAIL_DOMAIN}`, password });
        if (r.json?.accessToken) tokens[role] = r.json.accessToken;
    }
    for (const role of ['admin', 'employee']) {
        if (tokens[role]) await call(role, 'profile', 'GET', '/auth/me', tokens[role]);
    }

    if (tokens.admin) {
        await call('admin', 'employee list', 'GET', '/employees?page=1&limit=10', tokens.admin);
        await call('admin', 'approvals inbox', 'GET', '/approvals', tokens.admin);
    }
    if (tokens.employee) {
        await call('employee', 'check-in', 'POST', '/attendance/check-in', tokens.employee, {});
        const types = await call('employee', 'leave types', 'GET', '/leave/types', tokens.employee);
        const leaveTypeId = types.json?.items?.[0]?.id ?? types.json?.[0]?.id;
        if (leaveTypeId) {
            const d = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
            await call('employee', 'leave apply', 'POST', '/leave/apply', tokens.employee,
                { leave_type_id: leaveTypeId, start_date: d, end_date: d, reason: 'Staging smoke test' });
        } else {
            rows.push({ role: 'employee', step: 'leave apply', method: 'POST', path: '/leave/apply', status: 'SKIPPED', note: 'no leave types returned' });
        }
        await call('employee', 'check-out', 'POST', '/attendance/check-out', tokens.employee, {});
    }
    if (tokens.manager) await call('manager', 'approvals inbox', 'GET', '/approvals', tokens.manager);
    // Re-read the admin inbox so the leave-visibility question (baseline A1-3) is recorded.
    if (tokens.admin) await call('admin', 'approvals inbox after leave apply', 'GET', '/approvals', tokens.admin);

    const md = [
        `# Staging smoke results — ${new Date().toISOString()}`,
        '',
        'Recorded, not asserted (Release 0). Authorization expectations arrive in Release 1.',
        '',
        '| Role | Step | Method | Path | Status | Message |',
        '|---|---|---|---|---|---|',
        ...rows.map((r) => `| ${r.role} | ${r.step} | ${r.method} | ${r.path} | ${r.status} | ${r.note.replace(/\|/g, '/')} |`),
    ].join('\n');
    console.log(md);
    const outIdx = process.argv.indexOf('--out');
    if (outIdx > -1 && process.argv[outIdx + 1]) fs.writeFileSync(process.argv[outIdx + 1], md + '\n');
}

main().catch((err) => {
    console.error(`[smoke] FAILED: ${err.message}`);
    process.exit(1);
});
