import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { pool, directPool } from '../../src/config/db';
import { seededUsers, tokenFor } from '../setup/tokens';
import type { SeededUser } from '../setup/seed';

// Harness self-test (Release 0 — B0-03): proves the snapshot-built database,
// the factories, token issuance and the app all work together. Asserts only
// correct existing behavior.

const hasDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasDb)('integration harness', () => {
    let users: Record<string, SeededUser>;

    beforeAll(() => {
        users = seededUsers();
    });

    afterAll(async () => {
        await Promise.allSettled([pool.end(), directPool.end()]);
    });

    it('GET /auth/me returns the authenticated user', async () => {
        const u = users.employee;
        const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${tokenFor(u)}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(u.email);
    });

    it('POST /auth/login accepts the seeded credentials', async () => {
        const u = users.manager;
        const res = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: u.password });
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(u.email);
        expect(res.body.accessToken).toBeTruthy();
    });
});
