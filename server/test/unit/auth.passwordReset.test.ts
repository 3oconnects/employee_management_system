import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// HF-3: self-service password reset by emailed, single-use, expiring link.
//
// The repository is replaced by an in-memory fake that mirrors the guarded SQL in
// auth.repository.ts (status = 'issued', unexpired, same user + tenant, atomic single use).
// The real routes, validation, controller, service, token hashing and email template run.
// Nodemailer is mocked, so nothing is sent. The SQL itself is exercised separately against
// a scratch PostgreSQL cluster (see the HF-3 verification report); a unit test cannot cover it.

type User = {
    id: number; tenant_id: string; name: string; email: string; password: string;
    temp_password: string | null; is_password_temp: boolean; refresh_token: string | null;
    is_active: boolean; employee_id: string | null; role: string; role_id: number; dashboard_type: string;
};
type ResetRecord = {
    id: string; status: string; tenant_id: string; createdAt: number;
    metadata: { email?: string; user_id?: number; token_hash?: string; expires_at?: string; reset_token?: string };
};

const store = vi.hoisted(() => ({ users: [] as any[], records: [] as any[], failLookup: false }));
const sendMail = vi.hoisted(() => vi.fn());

vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

vi.mock('../../src/modules/auth/auth.repository', () => {
    const FRESH_MS = 1000;
    const impl = {
        async findUserForPasswordReset(email: string) {
            if (store.failLookup) throw new Error('db down');
            const u = store.users.find((x: User) => x.email.toLowerCase() === email.toLowerCase() && x.is_active && x.employee_id);
            return u ? { id: u.id, name: u.name, email: u.email, tenant_id: u.tenant_id, employee_id: u.employee_id } : null;
        },
        async hasRecentPasswordReset(userId: number, withinSeconds: number) {
            return store.records.some((r: ResetRecord) => r.metadata.user_id === userId && Date.now() - r.createdAt < withinSeconds * 1000);
        },
        async createPasswordResetToken(d: any) {
            store.records.forEach((r: ResetRecord) => {
                if (r.status === 'issued' && r.metadata.user_id === d.userId) r.status = 'superseded';
            });
            store.records.push({
                id: d.id, status: 'issued', tenant_id: d.tenantId, createdAt: Date.now(),
                metadata: { email: d.email, user_id: d.userId, token_hash: d.tokenHash, expires_at: d.expiresAt.toISOString() },
            });
        },
        async findPasswordResetByTokenHash(hash: string) {
            const r = store.records.find((x: ResetRecord) => x.metadata.token_hash === hash);
            return r ? { id: r.id, status: r.status, tenant_id: r.tenant_id, metadata: r.metadata } : null;
        },
        async consumePasswordReset(d: any) {
            // Single synchronous block = atomic, like the SQL transaction.
            const r = store.records.find((x: ResetRecord) => x.id === d.recordId);
            if (!r || r.status !== 'issued' || r.metadata.token_hash !== d.tokenHash) return false;
            if (!(Date.parse(r.metadata.expires_at as string) > Date.now())) return false;
            const u = store.users.find((x: User) => x.id === d.userId && x.tenant_id === d.tenantId && x.is_active);
            if (!u) return false;
            r.status = 'completed';
            u.password = d.hashedPassword; u.temp_password = null; u.is_password_temp = false; u.refresh_token = null;
            store.records.forEach((x: ResetRecord) => {
                if (x.status === 'issued' && x.metadata.user_id === d.userId && x.id !== d.recordId) x.status = 'superseded';
            });
            return true;
        },
        // login path (used to prove the old password stops working and the new one works)
        async findUserByEmail(email: string) {
            return store.users.find((x: User) => x.email.toLowerCase() === email.toLowerCase() && x.is_active);
        },
        async findRolePermissions() { return []; },
        async updateRefreshToken(id: number, token: string | null) {
            const u = store.users.find((x: User) => x.id === id);
            if (u) u.refresh_token = token;
        },
    };
    void FRESH_MS;
    return { AuthRepository: vi.fn().mockImplementation(() => impl) };
});

import authRouter from '../../src/modules/auth/auth.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { hashResetToken, PASSWORD_RESET_REQUEST_MESSAGE, PASSWORD_RESET_INVALID_MESSAGE } from '../../src/modules/auth/auth.service';

// Same routes, validation, controller and service as the real app, minus the per-IP rate
// limiter (which would throttle this many requests; it is covered separately).
const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use(globalErrorHandler);

const OLD_PASSWORD = 'Old-Passw0rd!';
const NEW_PASSWORD = 'Brand-New-Passw0rd!';
const makeUser = (over: Partial<User>): User => ({
    id: 1, tenant_id: 'tenant_a', name: 'Priya <b>Sharma</b>', email: 'priya@company.com',
    password: bcrypt.hashSync(OLD_PASSWORD, 4), temp_password: 'TempPass1', is_password_temp: true,
    refresh_token: 'stale-refresh-token', is_active: true, employee_id: 'EMP001',
    role: 'employee', role_id: 4, dashboard_type: 'employee', ...over,
});

const forgot = (email: unknown) => request(app).post('/api/v1/auth/forgot-password').send({ email });
const reset = (body: Record<string, unknown>) => request(app).post('/api/v1/auth/reset-password').send(body);
const login = (email: string, password: string) => request(app).post('/api/v1/auth/login').send({ email, password });
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Requests a reset and returns the token exactly as a user would see it: from the email link. */
async function requestAndReadToken(email = 'priya@company.com'): Promise<string> {
    sendMail.mockClear();
    const res = await forgot(email);
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(1));
    const html: string = sendMail.mock.calls[0][0].html;
    const m = html.match(/\/login#reset_token=([A-Za-z0-9_-]+)/);
    expect(m, 'reset link with token fragment is in the email').toBeTruthy();
    return m![1];
}
const expireAllRecords = () =>
    store.records.forEach((r: ResetRecord) => { r.metadata.expires_at = new Date(Date.now() - 1000).toISOString(); });
const ageAllRecords = () => store.records.forEach((r: ResetRecord) => { r.createdAt -= 5 * 60 * 1000; });

let logSpies: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
    store.users = [
        makeUser({}),
        makeUser({ id: 2, tenant_id: 'tenant_b', name: 'Ben', email: 'ben@other.com', employee_id: 'EMP900', temp_password: null, is_password_temp: false }),
    ];
    store.records = [];
    store.failLookup = false;
    sendMail.mockReset().mockResolvedValue({});
    process.env.GMAIL_USER = 'sender@example.test';
    process.env.GMAIL_APP_PASSWORD = 'unit-test-app-password';
    process.env.APP_URL = 'https://nexus.example.test';
    logSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
    logSpies.forEach((s) => s.mockRestore());
    delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD; delete process.env.APP_URL;
});

describe('HF-3 forgot-password: generic, credential-free response', () => {
    it('existing and unknown emails get the identical generic response', async () => {
        const known = await forgot('priya@company.com');
        const unknown = await forgot('nobody@nowhere.example');
        expect(known.status).toBe(200);
        expect(unknown.status).toBe(200);
        expect(known.body).toEqual(unknown.body);
        expect(known.body).toEqual({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
    });

    it('never returns a reset token or a request id', async () => {
        const token = await requestAndReadToken();
        const res = await forgot('priya@company.com');
        const text = JSON.stringify(res.body);
        expect(Object.keys(res.body).sort()).toEqual(['message', 'success']);
        expect(text).not.toContain(token);
        expect(text).not.toMatch(/token|requestId|PR-/i);
    });

    it('does not reveal accounts through a failure either', async () => {
        store.failLookup = true;
        const res = await forgot('priya@company.com');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
    });

    it('rejects a malformed or missing email before any lookup', async () => {
        expect((await forgot('not-an-email')).status).toBe(400);
        expect((await forgot(undefined)).status).toBe(400);
    });

    it('sends nothing for an unknown email or an inactive account', async () => {
        await forgot('nobody@nowhere.example');
        store.users[0].is_active = false;
        await forgot('priya@company.com');
        await flush();
        expect(sendMail).not.toHaveBeenCalled();
        expect(store.records).toHaveLength(0);
    });

    it('the old status endpoint (which used to return the token) no longer exists', async () => {
        const res = await request(app).get('/api/v1/auth/forgot-password/status').query({ email: 'priya@company.com' });
        expect(res.status).toBe(404);
    });
});

describe('HF-3 the reset email and the stored record', () => {
    it('emails the link to the account, with the token in the URL fragment', async () => {
        const token = await requestAndReadToken();
        const mail = sendMail.mock.calls[0][0];
        expect(mail.to).toBe('priya@company.com');
        expect(mail.html).toContain(`https://nexus.example.test/login#reset_token=${token}`);
        expect(token.length).toBeGreaterThanOrEqual(43); // 256 bits, base64url
        expect(mail.html).toContain('30 minutes');
    });

    it('escapes user-controlled text in the email', async () => {
        await requestAndReadToken();
        const html: string = sendMail.mock.calls[0][0].html;
        expect(html).toContain('Priya &lt;b&gt;Sharma&lt;/b&gt;');
        expect(html).not.toContain('<b>Sharma</b>');
    });

    it('stores only the SHA-256 hash of the token, never the token', async () => {
        const token = await requestAndReadToken();
        expect(store.records).toHaveLength(1);
        expect(store.records[0].metadata.token_hash).toBe(hashResetToken(token));
        expect(store.records[0].metadata.token_hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
        expect(JSON.stringify(store.records)).not.toContain(token);
        expect(store.records[0].metadata.reset_token).toBeUndefined();
    });

    it('binds the record to the user and tenant and expires it in 30 minutes', async () => {
        await requestAndReadToken();
        const rec = store.records[0];
        expect(rec.metadata.user_id).toBe(1);
        expect(rec.tenant_id).toBe('tenant_a');
        const minutes = (Date.parse(rec.metadata.expires_at!) - Date.now()) / 60000;
        expect(minutes).toBeGreaterThan(29);
        expect(minutes).toBeLessThanOrEqual(30);
    });

    it('is throttled per account: a second request inside the cooldown sends no second email', async () => {
        await requestAndReadToken();
        const again = await forgot('priya@company.com');
        await flush();
        expect(again.body).toEqual({ success: true, message: PASSWORD_RESET_REQUEST_MESSAGE });
        expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('a newer link supersedes the older one', async () => {
        const first = await requestAndReadToken();
        ageAllRecords();
        const second = await requestAndReadToken();
        expect((await reset({ token: first, newPassword: NEW_PASSWORD })).status).toBe(400);
        expect((await reset({ token: second, newPassword: NEW_PASSWORD })).status).toBe(200);
    });
});

describe('HF-3 reset-password: the token is mandatory and the only authority', () => {
    it('valid token: resets, old password stops working, new one works, session state cleared', async () => {
        const token = await requestAndReadToken();
        expect(store.users[0].refresh_token).toBe('stale-refresh-token');

        const res = await reset({ token, newPassword: NEW_PASSWORD });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(JSON.stringify(res.body)).not.toContain(token);

        expect((await login('priya@company.com', OLD_PASSWORD)).status).toBe(401);
        expect((await login('priya@company.com', 'TempPass1')).status).toBe(401); // old temp password is cleared too
        const ok = await login('priya@company.com', NEW_PASSWORD);
        expect(ok.status).toBe(200);
        expect(ok.body.accessToken).toEqual(expect.any(String));
        expect(store.users[0].is_password_temp).toBe(false);
    });

    it('clears the stored refresh credential', async () => {
        const token = await requestAndReadToken();
        await reset({ token, newPassword: NEW_PASSWORD });
        expect(store.users[0].refresh_token).toBeNull();
    });

    it('missing token is rejected and nothing changes', async () => {
        await requestAndReadToken();
        const before = store.users[0].password;
        const res = await reset({ newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(store.users[0].password).toBe(before);
    });

    it('email + new password alone can never reset a password', async () => {
        await requestAndReadToken();
        const before = store.users[0].password;
        const res = await reset({ email: 'priya@company.com', newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(store.users[0].password).toBe(before);
    });

    it('invalid token is rejected with the generic message', async () => {
        await requestAndReadToken();
        const before = store.users[0].password;
        const res = await reset({ token: 'x'.repeat(43), newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(PASSWORD_RESET_INVALID_MESSAGE);
        expect(store.users[0].password).toBe(before);
    });

    it('expired token is rejected', async () => {
        const token = await requestAndReadToken();
        expireAllRecords();
        const before = store.users[0].password;
        const res = await reset({ token, newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe(PASSWORD_RESET_INVALID_MESSAGE);
        expect(store.users[0].password).toBe(before);
    });

    it('a used token is rejected and the same token cannot reset twice', async () => {
        const token = await requestAndReadToken();
        expect((await reset({ token, newPassword: NEW_PASSWORD })).status).toBe(200);
        const second = await reset({ token, newPassword: 'Another-Passw0rd!' });
        expect(second.status).toBe(400);
        expect(second.body.message).toBe(PASSWORD_RESET_INVALID_MESSAGE);
        expect((await login('priya@company.com', NEW_PASSWORD)).status).toBe(200); // still the first reset's password
        expect((await login('priya@company.com', 'Another-Passw0rd!')).status).toBe(401);
    });

    it('two simultaneous uses of one token: exactly one wins', async () => {
        const token = await requestAndReadToken();
        const [a, b] = await Promise.all([
            reset({ token, newPassword: 'Race-Winner-A-1!' }),
            reset({ token, newPassword: 'Race-Winner-B-2!' }),
        ]);
        expect([a.status, b.status].sort()).toEqual([200, 400]);
    });

    it("a token issued for one user cannot reset another user's password", async () => {
        const token = await requestAndReadToken('priya@company.com');
        const benBefore = store.users[1].password;
        const res = await reset({ token, email: 'ben@other.com', newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(store.users[1].password).toBe(benBefore);
        expect(store.users[0].password).not.toBe(benBefore);
        expect((await login('priya@company.com', OLD_PASSWORD)).status).toBe(200); // Priya untouched
    });

    it('a token cannot cross tenants', async () => {
        const token = await requestAndReadToken('priya@company.com');
        // The record claims a different tenant than the user belongs to: must not apply.
        store.records[0].tenant_id = 'tenant_b';
        const before = store.users[0].password;
        const res = await reset({ token, newPassword: NEW_PASSWORD });
        expect(res.status).toBe(400);
        expect(store.users[0].password).toBe(before);
        expect(store.users[1].password).not.toBe(bcrypt.hashSync(NEW_PASSWORD, 4));
    });

    it('legacy approval-style records (raw reset_token, no hash) are not accepted', async () => {
        store.records.push({
            id: 'PR-legacy', status: 'approved', tenant_id: 'tenant_a', createdAt: Date.now() - 1e9,
            metadata: { email: 'priya@company.com', user_id: 1, reset_token: 'legacy-raw-token-value' },
        });
        const before = store.users[0].password;
        for (const token of ['legacy-raw-token-value', hashResetToken('legacy-raw-token-value')]) {
            expect((await reset({ token, newPassword: NEW_PASSWORD })).status).toBe(400);
        }
        expect(store.users[0].password).toBe(before);
    });

    it('enforces the minimum password length', async () => {
        const token = await requestAndReadToken();
        expect((await reset({ token, newPassword: 'abc' })).status).toBe(400);
        expect((await reset({ token, newPassword: NEW_PASSWORD })).status).toBe(200); // token was not burned
    });
});

describe('HF-3 logging', () => {
    it('never writes the reset token, its hash or a password to the logs', async () => {
        const token = await requestAndReadToken();
        await forgot('nobody@nowhere.example');
        await reset({ token: 'bad-token', newPassword: NEW_PASSWORD });
        await reset({ token, newPassword: NEW_PASSWORD });
        store.failLookup = true;
        await forgot('priya@company.com');
        await flush();

        const logged = logSpies.flatMap((s) => s.mock.calls).map((args) => args.map(String).join(' ')).join('\n');
        expect(logged).not.toContain(token);
        expect(logged).not.toContain(hashResetToken(token));
        expect(logged).not.toContain(NEW_PASSWORD);
        expect(logged).not.toContain('reset_token');
    });
});
