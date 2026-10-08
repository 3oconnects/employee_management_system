import { test, expect } from '@playwright/test';
import { apiAs, guestApi } from '../helpers/auth';

const GET_ENDPOINTS = [
  'employees', 'employees/me', 'leave/types', 'leave/requests', 'attendance/today', 'claims', 'approvals',
  'notifications', 'payroll/employees', 'payroll/runs', 'reports/admin', 'reports/manager', 'reports/employee',
  'audit-logs', 'settings/roles', 'settings/users', 'organization', 'workspace', 'governance',
];

test.describe('RBAC / API without authentication (Guest)', () => {
  for (const ep of GET_ENDPOINTS) {
    test(`GUEST GET ${ep} is not 200`, async () => {
      const r = await (await guestApi()).get(ep);
      expect(r.status(), `${ep} reachable unauthenticated`).not.toBe(200);
      expect([401, 403, 404]).toContain(r.status());
    });
  }
  test('GUEST health endpoint is public and leaks no secrets', async () => {
    const r = await (await guestApi()).get('health');
    expect(r.status()).toBe(200);
    expect(JSON.stringify(await r.json())).not.toMatch(/secret|password|postgres:\/\//i);
  });
  test('GUEST GET /auth/repair-identity is disabled', async () => {
    const r = await (await guestApi()).get('auth/repair-identity');
    expect(await r.text()).toMatch(/disabled/i);
  });
});

test.describe('RBAC / Employee must be denied privileged APIs', () => {
  const DENY = ['payroll/employees', 'payroll/runs', 'reports/admin', 'claims', 'settings/roles', 'settings/users', 'audit-logs'];
  for (const ep of DENY) {
    test(`EMPLOYEE GET ${ep} -> 401/403`, async () => {
      const r = await (await apiAs('employee')).get(ep);
      expect([401, 403]).toContain(r.status());
    });
  }
  test('EMPLOYEE cannot create employee', async () => {
    const r = await (await apiAs('employee')).post('employees', { data: { name: 'X Probe', email: 'x.probe@ems-staging.example.test' } });
    expect([401, 403]).toContain(r.status());
  });
  test('EMPLOYEE cannot delete employee', async () => {
    const r = await (await apiAs('employee')).delete('employees/EMP-STG-001');
    expect([401, 403]).toContain(r.status());
  });
  test('EMPLOYEE cannot update ANOTHER employee [suspected IDOR: PUT /employees/:id has no authorize()]', async () => {
    const r = await (await apiAs('employee')).put('employees/EMP-STG-001', { data: { name: 'Edited By Employee' } });
    expect([401, 403, 404], `got ${r.status()}`).toContain(r.status());
  });
  test('EMPLOYEE cannot read ANOTHER employee education/experience/emergency contacts [suspected IDOR]', async () => {
    const api = await apiAs('employee');
    for (const p of ['education', 'experience', 'emergency-contacts']) {
      const r = await api.get(`employees/EMP-STG-001/${p}`);
      expect([401, 403, 404], `${p}: ${r.status()}`).toContain(r.status());
    }
  });
  test('EMPLOYEE cannot approve leave', async () => {
    const r = await (await apiAs('employee')).put('leave/1/approve', { data: { status: 'approved' } });
    expect([401, 403, 404]).toContain(r.status());
  });
  test("EMPLOYEE cannot read another user's attendance summary", async () => {
    const r = await (await apiAs('employee')).get('attendance/summary/1');
    expect([401, 403]).toContain(r.status());
  });
});

test.describe('RBAC / Manager', () => {
  test('MANAGER denied payroll, settings, audit logs, admin report', async () => {
    const api = await apiAs('manager');
    for (const ep of ['payroll/employees', 'settings/roles', 'audit-logs', 'reports/admin']) {
      expect([401, 403], ep).toContain((await api.get(ep)).status());
    }
  });
  test('MANAGER can list employees and approvals', async () => {
    const api = await apiAs('manager');
    expect((await api.get('employees')).status()).toBe(200);
    expect((await api.get('approvals')).status()).toBe(200);
  });
});

test.describe('RBAC / Admin sanity', () => {
  for (const ep of ['employees', 'settings/roles', 'payroll/runs', 'reports/admin', 'notifications']) {
    test(`ADMIN GET ${ep} -> 200`, async () => {
      expect((await (await apiAs('admin')).get(ep)).status()).toBe(200);
    });
  }
});

test.describe('Security headers / CORS', () => {
  test('CORS: arbitrary *.vercel.app origin must not be trusted with credentials [suspected misconfig]', async () => {
    const r = await (await guestApi()).get('health', { headers: { Origin: 'https://attacker-example.vercel.app' } });
    expect(r.headers()['access-control-allow-origin']).toBeUndefined();
  });
  test('CORS: foreign origin not reflected', async () => {
    const r = await (await guestApi()).get('health', { headers: { Origin: 'https://evil.example.com' } });
    expect(r.headers()['access-control-allow-origin']).toBeUndefined();
  });
  test('x-content-type-options: nosniff present', async () => {
    const r = await (await guestApi()).get('health');
    expect(r.headers()['x-content-type-options']).toBe('nosniff');
  });
  test('Error responses do not leak stack traces', async () => {
    const r = await (await apiAs('admin')).get('employees/%00%27');
    expect(await r.text()).not.toMatch(/at .*\.(ts|js):\d+/);
  });
});
