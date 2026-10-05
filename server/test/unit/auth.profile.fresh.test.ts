import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// GET /auth/me reports the person's CURRENT role, dashboard and permissions from the database,
// not the claims in the token they signed in with.

type Row = Record<string, any>;
const W = vi.hoisted(() => ({ profile: undefined as Row | undefined, asked: [] as number[] }));

vi.mock('../../src/modules/auth/auth.repository', () => ({
    AuthRepository: class {
        async findUserProfile(id: number) { W.asked.push(id); return W.profile ? { ...W.profile } : undefined; }
    },
}));
vi.mock('../../src/config/db', () => ({ pool: { query: async () => ({ rows: [] }) }, directPool: {}, query: async () => ({ rows: [] }) }));
vi.mock('../../src/services/auditService', () => ({ AuditService: {} }));
vi.mock('../../src/services/realtimeService', () => ({ RealtimeService: {} }));
vi.mock('../../src/services/emailService', () => ({ sendPasswordResetEmail: vi.fn(), sendEmail: vi.fn() }));
vi.mock('../../src/core/events/eventPublisher', () => ({ EventPublisher: { publish: vi.fn() } }));

import authRouter from '../../src/modules/auth/auth.routes';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use(globalErrorHandler);

// the token was issued when the person was still an employee
const staleToken = 'Bearer ' + JwtService.generateAccessToken({ userId: 7, email: 's@x.test', tenantId: 'tA', role: 'employee' as any, dashboard_type: 'employee', permissions: ['attendance:view'] } as any);
const me = () => request(app).get('/api/v1/auth/me').set('Authorization', staleToken);

beforeEach(() => { W.asked = []; W.profile = undefined; });

describe('GET /auth/me', () => {
    it('returns the role, dashboard type and permissions the DATABASE holds now, not the token\'s claims', async () => {
        W.profile = { id: 7, name: 'Sridhar', email: 's@x.test', tenant_id: 'tA', role: 'manager', role_id: 2, dashboard_type: 'manager', permissions: ['attendance:view', 'leave:approve'], availability_status: 'busy' };
        const r = await me();
        expect(r.status).toBe(200);
        expect(r.body.user).toMatchObject({ role: 'manager', dashboard_type: 'manager', availability_status: 'busy' });
        expect(r.body.user.permissions).toEqual(['attendance:view', 'leave:approve']);
    });

    it('asks only about the person in the token', async () => {
        W.profile = { id: 7, role: 'employee', dashboard_type: 'employee', permissions: [] };
        await request(app).get('/api/v1/auth/me?id=1&userId=1').set('Authorization', staleToken);
        expect(W.asked).toEqual([7]);
    });

    it('defaults sensibly when the role has no dashboard type or permissions', async () => {
        W.profile = { id: 7, role: 'custom', dashboard_type: null, permissions: null };
        const r = await me();
        expect(r.body.user.dashboard_type).toBe('employee');
        expect(r.body.user.permissions).toEqual([]);
    });

    it('404 for an account that no longer exists; 401 without a token', async () => {
        expect((await me()).status).toBe(404);
        expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
    });

    it('does not echo credential fields', async () => {
        W.profile = { id: 7, role: 'employee', dashboard_type: 'employee', permissions: [] };
        expect(JSON.stringify((await me()).body)).not.toMatch(/password|temp_password|refresh/i);
    });
});

describe('the profile query tolerates an older users table', () => {
    it('reads optional columns through to_jsonb so a missing phone/address/avatar column cannot break it', async () => {
        const { readFileSync } = await import('node:fs');
        const src = readFileSync('src/modules/auth/auth.repository.ts', 'utf8');
        const q = src.slice(src.indexOf('async findUserProfile'), src.indexOf('async findRolePermissions'));
        for (const col of ['phone', 'address', 'emergency', 'avatar_url', 'preferences', 'availability_status']) {
            expect(q, col).toMatch(new RegExp(`to_jsonb\\(u\\)(->>|->)'${col}'`));
        }
        expect(q).not.toMatch(/\bu\.phone\b|\bu\.address\b|\bu\.emergency\b|\bu\.avatar_url\b|\bu\.preferences\b|\bu\.availability_status\b/);
        expect(q).toMatch(/COALESCE\(u\.role_id, 4\)/);   // the same role resolution as login
    });
});
