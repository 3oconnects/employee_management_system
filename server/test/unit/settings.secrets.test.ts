import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// HF-7: settings endpoints must not hand out credentials.
//   - GET /settings/users never carries temp_password; the read-back endpoint is gone
//   - GET /settings/config masks every secret and a masked value written back means "unchanged"
//
// Real: JWT, the real settings router, controllers, services and the SQL text they send.
// Fake: the pool, which answers from an in-memory model and only returns a column if the SQL asks for it.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    config: [
        { category: 'email', key: 'smtp_host', value: 'smtp.example.com' },
        { category: 'email', key: 'smtp_pass', value: 'S3CRET-SMTP-PASSWORD' },
        { category: 'email', key: 'smtp_user', value: 'mailer@example.com' },
        { category: 'integrations', key: 'api_key', value: 'nx_live_ABCDEF123456' },
        { category: 'integrations', key: 'slack_webhook', value: 'https://hooks.slack.com/services/T000/B000/XXXXSECRET' },
        { category: 'integrations', key: 'teams_webhook', value: '' },
        { category: 'integrations', key: 'webhook_url', value: 'https://example.com/hook' },
        { category: 'general', key: 'company_name', value: 'Acme' },
    ] as Row[],
    upserts: [] as { category: string; key: string; value: string }[],
    userSql: [] as string[],
}));

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

vi.mock('../../src/config/db', () => {
    const query = async (sql: string, p: any[] = []) => {
        const q = norm(sql);
        if (q.startsWith('SELECT category, key, value FROM app_config')) return { rows: W.config.map((r) => ({ ...r })) };
        if (q.startsWith('INSERT INTO app_config')) {
            W.upserts.push({ category: p[1], key: p[2], value: p[3] });
            return { rows: [] };
        }
        if (q.startsWith('SELECT e.id as employee_id')) {
            W.userSql.push(q);
            const row: Row = { employee_id: 'E1', name: 'Eve', email: 'eve@t1.test', id: 10, role: 'employee', is_active: true, role_id: 1, is_password_temp: true, role_name: 'Employee' };
            if (q.includes('temp_password')) row.temp_password = 'PLAINTEXT-TEMP-PW'; // what the old SQL would have returned
            return { rows: [row] };
        }
        if (q.startsWith('SELECT u.id, u.name, u.email, u.role, u.temp_password')) {
            return { rows: [{ id: 10, name: 'Eve', email: 'eve@t1.test', role: 'employee', temp_password: 'PLAINTEXT-TEMP-PW', is_password_temp: true }] };
        }
        if (q.startsWith('UPDATE users SET password=$1, temp_password=$2')) return { rows: [{ id: 10 }] };
        return { rows: [] };
    };
    return { pool: { query, connect: async () => ({ query, release() {} }) }, directPool: {}, query };
});
vi.mock('../../src/services/emailService', () => ({
    sendEmail: vi.fn().mockResolvedValue(true),
    buildWelcomeEmail: vi.fn().mockReturnValue('<p/>'),
    buildRoleAssignmentEmail: vi.fn().mockReturnValue('<p/>'),
}));

import settingsRouter from '../../src/modules/settings';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';
import { SECRET_MASK, maskSecrets, isMaskPlaceholder } from '../../src/modules/settings/configuration/configuration.secrets';

const app = express();
app.use(express.json());
app.use('/api/v1/settings', settingsRouter);
app.use(globalErrorHandler);

type Who = { id: number; role: string; perms: string[]; tenant?: string; dash?: string };
const admin: Who = { id: 1, role: 'admin', dash: 'admin', perms: [] };
const settingsMgr: Who = { id: 2, role: 'custom', perms: ['settings:manage'] };
const plain: Who = { id: 3, role: 'employee', perms: [] };
const bearer = (w: Who) =>
    'Bearer ' + JwtService.generateAccessToken({ userId: w.id, email: `u${w.id}@t1.test`, tenantId: w.tenant ?? 't1', role: w.role as any, dashboard_type: w.dash, permissions: w.perms } as any);
const call = (method: 'get' | 'post' | 'put' | 'delete', url: string, who: Who | null, body?: Row) => {
    let r = (request(app) as any)[method](`/api/v1/settings${url}`);
    if (who) r = r.set('Authorization', bearer(who));
    return body ? r.send(body) : r;
};

const SECRETS = ['S3CRET-SMTP-PASSWORD', 'nx_live_ABCDEF123456', 'XXXXSECRET', 'PLAINTEXT-TEMP-PW'];
const leaks = (body: unknown) => SECRETS.filter((s) => JSON.stringify(body).includes(s));

beforeEach(() => { W.upserts.length = 0; W.userSql.length = 0; });

describe('HF-7 GET /settings/config never returns a secret', () => {
    it('masks smtp_pass, api_key and the webhook URLs; non-secrets are untouched', async () => {
        const r = await call('get', '/config', admin);
        expect(r.status).toBe(200);
        expect(leaks(r.body)).toEqual([]);
        expect(r.body.data.email.smtp_pass).toBe(SECRET_MASK);
        expect(r.body.data.integrations.api_key).toBe(SECRET_MASK);
        expect(r.body.data.integrations.slack_webhook).toBe(SECRET_MASK);
        expect(r.body.data.integrations.teams_webhook).toBe(''); // not set stays visibly "not set"
        expect(r.body.data.email.smtp_host).toBe('smtp.example.com');
        expect(r.body.data.email.smtp_user).toBe('mailer@example.com');
        expect(r.body.data.integrations.webhook_url).toBe('https://example.com/hook');
        expect(r.body.data.general.company_name).toBe('Acme');
    });

    it('a settings:manage holder (non-admin role) gets the same masked view', async () => {
        const r = await call('get', '/config', settingsMgr);
        expect(r.status).toBe(200);
        expect(leaks(r.body)).toEqual([]);
    });

    it('is not available without a token, or to an ordinary employee', async () => {
        expect((await call('get', '/config', null)).status).toBe(401);
        expect((await call('get', '/config', plain)).status).toBe(403);
    });
});

describe('HF-7 PUT /settings/config: the mask means "unchanged"', () => {
    it('saving the form with the mask back does not overwrite the stored secret', async () => {
        const r = await call('put', '/config', admin, {
            category: 'email',
            settings: { smtp_host: 'smtp2.example.com', smtp_pass: SECRET_MASK, smtp_user: 'm2@example.com' },
        });
        expect(r.status).toBe(200);
        expect(W.upserts.map((u) => u.key).sort()).toEqual(['smtp_host', 'smtp_user']);
        expect(W.upserts.some((u) => u.key === 'smtp_pass')).toBe(false);
    });

    it('a bullet placeholder of any length is also "unchanged" (the integrations tab shows a longer one)', async () => {
        await call('put', '/config', admin, { category: 'integrations', settings: { api_key: '••••••••••••••••••••••••', webhook_url: 'https://x.test' } });
        expect(W.upserts.map((u) => u.key)).toEqual(['webhook_url']);
    });

    it('a genuinely new secret is stored', async () => {
        await call('put', '/config', admin, { category: 'email', settings: { smtp_pass: 'NewPassw0rd!' } });
        expect(W.upserts).toEqual([{ category: 'email', key: 'smtp_pass', value: 'NewPassw0rd!' }]);
    });

    it('clearing a secret (empty string) is allowed', async () => {
        await call('put', '/config', admin, { category: 'email', settings: { smtp_pass: '' } });
        expect(W.upserts).toEqual([{ category: 'email', key: 'smtp_pass', value: '' }]);
    });

    it('the mask is only special for secret keys: a normal setting that happens to be bullets is stored', async () => {
        await call('put', '/config', admin, { category: 'general', settings: { company_name: '•••' } });
        expect(W.upserts).toEqual([{ category: 'general', key: 'company_name', value: '•••' }]);
    });
});

describe('HF-7 user list and temp-password endpoint', () => {
    it('GET /settings/users: the SQL does not select temp_password and the body has no such key', async () => {
        const r = await call('get', '/users', admin);
        expect(r.status).toBe(200);
        expect(W.userSql).toHaveLength(1);
        expect(W.userSql[0]).not.toContain('temp_password');
        expect(JSON.stringify(r.body)).not.toContain('temp_password');
        expect(leaks(r.body)).toEqual([]);
        expect(r.body.data[0].is_password_temp).toBe(true); // the status is still available
    });

    it('GET /settings/users/:id/temp-password no longer exists (404), for admins too', async () => {
        const a = await call('get', '/users/10/temp-password', admin);
        const b = await call('get', '/users/10/temp-password', settingsMgr);
        expect([a.status, b.status]).toEqual([404, 404]);
        expect(leaks(a.body)).toEqual([]);
        expect(leaks(b.body)).toEqual([]);
    });

    it('the controller and service no longer expose a read-back', async () => {
        const { readFileSync } = await import('node:fs');
        const base = 'src/modules/settings/user-assignments/';
        expect(readFileSync(base + 'user-assignments.routes.ts', 'utf8')).not.toMatch(/temp-password/);
        expect(readFileSync(base + 'user-assignments.controller.ts', 'utf8')).not.toMatch(/getTempPassword/);
        expect(readFileSync(base + 'user-assignments.service.ts', 'utf8')).not.toMatch(/getTempPassword/);
    });
});

describe('HF-7 helper behaviour', () => {
    it('maskSecrets only touches secret keys that hold a value', () => {
        expect(maskSecrets({ email: { smtp_pass: 'x', smtp_host: 'h', api_key: '' } })).toEqual({
            email: { smtp_pass: SECRET_MASK, smtp_host: 'h', api_key: '' },
        });
    });
    it('isMaskPlaceholder recognises bullets only', () => {
        expect(isMaskPlaceholder('••••')).toBe(true);
        expect(isMaskPlaceholder(SECRET_MASK)).toBe(true);
        expect(isMaskPlaceholder('pass••••')).toBe(false);
        expect(isMaskPlaceholder('')).toBe(false);
        expect(isMaskPlaceholder(undefined)).toBe(false);
    });
});
