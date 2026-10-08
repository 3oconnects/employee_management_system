import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Availability status: changing one person's status changes ONLY that person's status.
// Real: JWT, route, schema, controller, service. Fake: the users table (in memory, mirroring the
// tenant- and id-scoped SQL) and the event publisher (captured).

type Row = Record<string, any>;
const W = vi.hoisted(() => ({
    users: [] as Row[],
    events: [] as { name: string; tenantId: string; payload: any }[],
    updates: [] as { id: number; tenantId: string; status: string }[],
    forceSaved: null as string | null,
}));

vi.mock('../../src/modules/auth/auth.repository', () => ({
    AuthRepository: class {
        async updateStatus(id: number, tenantId: string, status: string) {
            W.updates.push({ id, tenantId, status });
            const u = W.users.find((x) => x.id === id && x.tenant_id === tenantId);
            if (!u) return null;
            u.availability_status = W.forceSaved ?? status;
            return u.availability_status;
        }
        async findUserProfile(id: number) { const u = W.users.find((x) => x.id === id); return u ? { ...u } : undefined; }
    },
}));
vi.mock('../../src/core/events/eventPublisher', () => ({
    EventPublisher: { publish: (name: string, tenantId: string, payload: any) => { W.events.push({ name, tenantId, payload }); } },
}));
vi.mock('../../src/config/db', () => ({ pool: { query: async () => ({ rows: [] }) }, directPool: {}, query: async () => ({ rows: [] }) }));
vi.mock('../../src/services/auditService', () => ({ AuditService: {} }));
vi.mock('../../src/services/realtimeService', () => ({ RealtimeService: {} }));
vi.mock('../../src/services/emailService', () => ({ sendPasswordResetEmail: vi.fn(), sendEmail: vi.fn() }));

import authRouter from '../../src/modules/auth/auth.routes';
import { updateStatus as updateStatusController } from '../../src/modules/auth/auth.controller';
import { globalErrorHandler } from '../../src/core/errors/errorHandler';
import { JwtService } from '../../src/core/security/jwt.service';

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRouter);
app.use(globalErrorHandler);

const token = (u: Row) => 'Bearer ' + JwtService.generateAccessToken({ userId: u.id, email: u.email, tenantId: u.tenant_id, role: 'employee' as any, permissions: [] } as any);
const put = (u: Row | null, body: Row) => {
    let r = request(app).put('/api/v1/auth/status');
    if (u) r = r.set('Authorization', token(u));
    return r.send(body);
};
const statusOf = (id: number) => W.users.find((u) => u.id === id)!.availability_status;

beforeEach(() => {
    W.events = []; W.updates = []; W.forceSaved = null;
    W.users = [
        { id: 1, tenant_id: 'tA', email: 'admin@a.test', name: 'System Admin', availability_status: 'available' },
        { id: 2, tenant_id: 'tA', email: 'eve@a.test', name: 'Eve', availability_status: 'available' },
        { id: 3, tenant_id: 'tA', email: 'sam@a.test', name: 'Sam', availability_status: 'offline' },
        { id: 7, tenant_id: 'tB', email: 'bob@b.test', name: 'Bob', availability_status: 'available' },
    ];
});

describe('PUT /auth/status changes only the caller', () => {
    it('sets the caller\'s status and nobody else\'s, in the same tenant or another', async () => {
        const r = await put(W.users[0], { status: 'busy' });
        expect(r.status).toBe(200);
        expect(r.body.status).toBe('busy');
        expect([1, 2, 3, 7].map(statusOf)).toEqual(['busy', 'available', 'offline', 'available']);
    });

    it('the statement is bound to the caller\'s id AND tenant, both from the token', async () => {
        await put(W.users[0], { status: 'dnd' });
        expect(W.updates).toEqual([{ id: 1, tenantId: 'tA', status: 'dnd' }]);
    });

    it('a body that names another user, email or tenant is ignored', async () => {
        const r = await put(W.users[1], { status: 'busy', userId: 1, id: 1, email: 'admin@a.test', tenantId: 'tB', user_id: 7 });
        expect(r.status).toBe(200);
        expect([1, 2, 3, 7].map(statusOf)).toEqual(['available', 'busy', 'offline', 'available']);
        expect(W.updates).toEqual([{ id: 2, tenantId: 'tA', status: 'busy' }]);
    });

    it('a token for the right user id but the wrong tenant changes nothing (404)', async () => {
        const forged = { ...W.users[0], tenant_id: 'tB' };
        const r = await put(forged, { status: 'busy' });
        expect(r.status).toBe(404);
        expect([1, 2, 3, 7].map(statusOf)).toEqual(['available', 'available', 'offline', 'available']);
    });

    it('needs a token', async () => {
        expect((await put(null, { status: 'busy' })).status).toBe(401);
        expect(W.updates).toEqual([]);
    });

    it('only the known statuses are accepted; everything else is a 400 and nothing is written', async () => {
        for (const bad of [{ status: '' }, { status: 'BUSY' }, { status: 'busy ' }, { status: 'on fire' }, { status: 123 }, { status: ['busy'] }, {}, { status: null }, { status: 'x'.repeat(500) }]) {
            expect((await put(W.users[0], bad as Row)).status, JSON.stringify(bad).slice(0, 40)).toBe(400);
        }
        expect(W.updates).toEqual([]);
        expect(statusOf(1)).toBe('available');
    });

    it('all seven product statuses are accepted', async () => {
        for (const s of ['available', 'busy', 'away', 'lunch', 'break', 'dnd', 'offline']) {
            expect((await put(W.users[0], { status: s })).status, s).toBe(200);
            expect(statusOf(1)).toBe(s);
        }
    });
});

describe('the live update goes to the right tenant about the right person', () => {
    it('is published once, for the caller\'s tenant, with the caller\'s e-mail and the SAVED value', async () => {
        await put(W.users[0], { status: 'busy', email: 'eve@a.test', userId: 2 });
        const ev = W.events.filter((e) => e.name === 'realtime.broadcast_requested');
        expect(ev).toHaveLength(1);
        expect(ev[0].tenantId).toBe('tA');
        expect(ev[0].payload).toEqual({ userId: 1, email: 'admin@a.test', status: 'busy' });
    });

    it('is not published when the change was refused', async () => {
        await put(W.users[0], { status: 'nonsense' });
        await put({ ...W.users[0], tenant_id: 'tB' }, { status: 'busy' });
        expect(W.events.filter((e) => e.name === 'realtime.broadcast_requested')).toEqual([]);
    });
});

// The request schema strips unknown body keys before the controller runs. These call the controller itself with a
// hostile body, so the controller is protected on its own and not only by the schema in front of it.
describe('the controller on its own (no schema in front of it)', () => {
    const callController = async (user: Row, body: Row) => {
        const res = { json: vi.fn() };
        await updateStatusController({ user: { userId: user.id, email: user.email, tenantId: user.tenant_id, role: 'employee', permissions: [] }, body } as any, res as any);
        return res.json.mock.calls[0]?.[0];
    };

    it('takes identity, tenant and e-mail from the token even if the body names others', async () => {
        await callController(W.users[1], { status: 'busy', userId: 1, id: 1, email: 'admin@a.test', tenantId: 'tB' });
        expect(W.updates).toEqual([{ id: 2, tenantId: 'tA', status: 'busy' }]);
        expect([1, 2, 3, 7].map(statusOf)).toEqual(['available', 'busy', 'offline', 'available']);
        const ev = W.events.find((e) => e.name === 'realtime.broadcast_requested')!;
        expect(ev.tenantId).toBe('tA');
        expect(ev.payload.email).toBe('eve@a.test');
        expect(ev.payload.userId).toBe(2);
    });

    it('answers and broadcasts the STORED value, not the requested one', async () => {
        W.forceSaved = 'away';
        const body = await callController(W.users[0], { status: 'busy' });
        expect(body.status).toBe('away');
        expect(W.events.find((e) => e.name === 'realtime.broadcast_requested')!.payload.status).toBe('away');
    });
});

describe('two people, two statuses', () => {
    it('each one reads back their own after both have changed theirs', async () => {
        await put(W.users[0], { status: 'busy' });
        await put(W.users[1], { status: 'lunch' });
        await put(W.users[0], { status: 'dnd' });
        expect([1, 2, 3].map(statusOf)).toEqual(['dnd', 'lunch', 'offline']);
        const me1 = await request(app).get('/api/v1/auth/me').set('Authorization', token(W.users[0]));
        const me2 = await request(app).get('/api/v1/auth/me').set('Authorization', token(W.users[1]));
        expect([me1.body.user.availability_status, me2.body.user.availability_status]).toEqual(['dnd', 'lunch']);
    });
});

describe('the browser keeps no copy of the status', () => {
    it('the dashboard no longer reads or writes the shared localStorage key', async () => {
        const { readFileSync } = await import('node:fs');
        const dash = readFileSync('../client/src/modules/dashboard/pages/Dashboard.tsx', 'utf8');
        expect(dash).not.toMatch(/usr_status/);
        const header = readFileSync('../client/src/modules/profile/components/ProfileHeader.tsx', 'utf8');
        expect(header).not.toMatch(/background: '#10b981'/); // the fixed green "Online" badge is gone
        expect(header).toMatch(/availabilityOf\(emp\?\.availability_status\)/);
    });
});
