import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { pool, directPool } from '../../src/config/db';
import { seededUsers, tokenFor } from '../setup/tokens';
import type { SeededUser } from '../setup/seed';

// ============================================================================
// AUTHORIZATION MATRIX — skeleton (Release 0 — B0-03)
// ============================================================================
// Rows are added in Release 1 (S3/S4), one per guarded route, with the
// *required* (secure) expectation. Release 0 deliberately adds no rows: the
// matrix must never encode today's insecure behavior as correct.
//
// Row format:
//   { method: 'post', path: '/api/v1/payroll/process', body: {...},
//     expect: { employee: 403, manager: 403, hr: 200, admin: 200, super_admin: 200, custom: 403 } }
// ============================================================================

type Role = 'super_admin' | 'admin' | 'hr' | 'manager' | 'employee' | 'custom';

export interface AuthzRow {
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    body?: Record<string, unknown>;
    /** Expected status per role. A role omitted here is not asserted. */
    expect: Partial<Record<Role, number>>;
    /** Baseline finding ID this row protects (e.g. "S3", "S4"). */
    finding: string;
}

export const MATRIX: AuthzRow[] = [
    // Release 1 fills this in.
];

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)('authorization matrix', () => {
    let users: Record<string, SeededUser>;

    beforeAll(() => {
        users = seededUsers();
    });

    afterAll(async () => {
        await Promise.allSettled([pool.end(), directPool.end()]);
    });

    it('seeds one user per role', () => {
        expect(Object.keys(users).sort()).toEqual(['admin', 'custom', 'employee', 'hr', 'manager', 'super_admin']);
    });

    for (const row of MATRIX) {
        for (const [role, status] of Object.entries(row.expect)) {
            it(`[${row.finding}] ${row.method.toUpperCase()} ${row.path} as ${role} → ${status}`, async () => {
                const req = request(app)[row.method](row.path).set('Authorization', `Bearer ${tokenFor(users[role])}`);
                const res = row.body ? await req.send(row.body) : await req;
                expect(res.status).toBe(status);
            });
        }
    }
});
