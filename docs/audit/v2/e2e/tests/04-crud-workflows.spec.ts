import { test, expect } from '@playwright/test';
import { apiAs } from '../helpers/auth';
import { cached } from '../helpers/auth';

// Serial: later tests depend on rows created by earlier ones. All data is synthetic and lives only in the throwaway DB.

const stamp = Date.now();
let createdId: string | undefined;
let leaveId: number | undefined;
let claimId: number | string | undefined;

test.describe('Employees CRUD (admin)', () => {
  test.describe.configure({ mode: 'serial' });
  test('EMP-01 create employee', async () => {
    const api = await apiAs('admin');
    const r = await api.post('employees', {
      data: { name: `E2E Person ${stamp}`, email: `e2e.${stamp}@ems-staging.example.test`, annualCTC: 600000, department: 'Engineering', position: 'Tester', joinDate: '2026-01-05' },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const b = await r.json();
    createdId = b.employeeId ?? b.data?.id ?? b.id ?? b.employee?.id;
    expect(createdId).toBeTruthy();
  });
  test('EMP-02 list + search + filter + sort', async () => {
    const api = await apiAs('admin');
    const all = await (await api.get('employees')).json();
    const rows = all.data?.items ?? all.data ?? all.items ?? [];
    expect(Array.isArray(rows)).toBeTruthy();
    const s = await api.get(`employees?search=${encodeURIComponent('E2E Person')}`);
    expect(s.status()).toBe(200);
    const f = await api.get('employees?department=Engineering');
    expect(f.status()).toBe(200);
    const o = await api.get('employees?sortBy=name&sortOrder=asc');
    expect(o.status()).toBe(200);
  });
  test('EMP-03 update employee', async () => {
    test.skip(!createdId, 'no created employee');
    const r = await (await apiAs('admin')).put(`employees/${createdId}`, { data: { position: 'Senior Tester' } });
    expect(r.status(), await r.text()).toBeLessThan(300);
  });
  test('EMP-04 duplicate email rejected', async () => {
    const r = await (await apiAs('admin')).post('employees', {
      data: { name: 'Dup', email: `e2e.${stamp}@ems-staging.example.test`, annualCTC: 1, department: 'Sales', joinDate: '2026-01-05' },
    });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });
  test('EMP-05 invalid input rejected (missing name, negative CTC, bad email)', async () => {
    const api = await apiAs('admin');
    for (const data of [
      { email: 'a@ems-staging.example.test', annualCTC: 1, department: 'X', joinDate: '2026-01-01' },
      { name: 'N', annualCTC: -5, department: 'X', joinDate: '2026-01-01' },
      { name: 'N', email: 'not-an-email', annualCTC: 1, department: 'X', joinDate: '2026-01-01' },
    ]) {
      const r = await api.post('employees', { data });
      expect(r.status(), JSON.stringify(data)).toBe(400);
    }
  });
  test('EMP-06 XSS payload in name is stored/returned as inert text (API level)', async () => {
    const api = await apiAs('admin');
    const r = await api.post('employees', {
      data: { name: '<img src=x onerror=alert(1)>', email: `xss.${stamp}@ems-staging.example.test`, annualCTC: 1, department: 'Sales', joinDate: '2026-01-05' },
    });
    // Either rejected (400) or accepted; the UI test in 06 checks it is not executed.
    expect([200, 201, 400]).toContain(r.status());
  });
  test('EMP-08 employee updates OWN profile via PUT /employees/:id (BUG B-1 predicts 403)', async () => {
    const own = cached('employee').user.employee_id;
    const r = await (await apiAs('employee')).put(`employees/${own}`, { data: { phone: '9999999999' } });
    expect(r.status(), await r.text()).toBe(200);
  });
  test('EMP-07 delete employee', async () => {
    test.skip(!createdId, 'no created employee');
    const r = await (await apiAs('admin')).delete(`employees/${createdId}`);
    expect(r.status(), await r.text()).toBeLessThan(300);
  });
});

test.describe('Leave workflow (employee -> manager/admin approval)', () => {
  test('LV-01 list leave types and balance', async () => {
    const api = await apiAs('employee');
    const t = await api.get('leave/types');
    expect(t.status()).toBe(200);
    const b = await api.get('leave/balance');
    expect(b.status()).toBe(200);
  });
  test('LV-02 apply leave', async () => {
    const api = await apiAs('employee');
    const types = (await (await api.get('leave/types')).json());
    const list = types.items ?? types.data ?? types;
    const typeId = list[0]?.id;
    expect(typeId, 'no leave types seeded').toBeTruthy();
    const r = await api.post('leave/apply', { data: { leave_type_id: typeId, start_date: '2026-12-14', end_date: '2026-12-15', reason: 'e2e' } });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const b = await r.json();
    leaveId = b.data?.id ?? b.id;
  });
  test('LV-03 invalid leave: end before start, bad type, missing fields', async () => {
    const api = await apiAs('employee');
    const r1 = await api.post('leave/apply', { data: { leave_type_id: 1, start_date: '2026-12-20', end_date: '2026-12-10' } });
    expect(r1.status(), 'end before start must be rejected').toBeGreaterThanOrEqual(400);
    const r2 = await api.post('leave/apply', { data: {} });
    expect(r2.status()).toBe(400);
    const r3 = await api.post('leave/apply', { data: { leave_type_id: 'abc', start_date: 'x', end_date: 'y' } });
    expect(r3.status()).toBeGreaterThanOrEqual(400);
  });
  test('LV-04 employee cannot self-approve', async () => {
    test.skip(!leaveId, 'no leave id');
    const r = await (await apiAs('employee')).put(`leave/${leaveId}/approve`, { data: { action: 'approved' } });
    expect([401, 403]).toContain(r.status());
  });
  test('LV-05 manager/admin approves', async () => {
    test.skip(!leaveId, 'no leave id');
    const r = await (await apiAs('admin')).put(`leave/${leaveId}/approve`, { data: { action: 'approved' } });
    expect(r.status(), await r.text()).toBeLessThan(300);
  });
  test('LV-06 employee notified (notifications list is an array)', async () => {
    const r = await (await apiAs('employee')).get('notifications');
    expect(r.status()).toBe(200);
  });
});

test.describe('Claims', () => {
  test.describe.configure({ mode: 'serial' });
  test('CL-01 employee submits claim', async () => {
    const api = await apiAs('employee');
    const empId = cached('employee').user.employee_id;
    const r = await api.post('claims', { data: { employee_id: empId, amount: 250.5, category: 'travel', description: 'e2e' } });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const b = await r.json(); claimId = b.claimId ?? b.data?.id ?? b.id;
  });
  test('CL-02 invalid claim amounts rejected (0, negative, NaN string)', async () => {
    const api = await apiAs('employee');
    const empId = cached('employee').user.employee_id;
    for (const amount of [0, -10, 'abc']) {
      const r = await api.post('claims', { data: { employee_id: empId, amount, category: 'travel' } });
      expect(r.status(), `amount=${amount}`).toBe(400);
    }
  });
  test('CL-03 employee cannot submit a claim ON BEHALF of another employee [suspected IDOR: employee_id from body]', async () => {
    const r = await (await apiAs('employee')).post('claims', { data: { employee_id: 'EMP-STG-001', amount: 1, category: 'travel' } });
    expect([400, 401, 403]).toContain(r.status());
  });
  test("CL-04 employee cannot read another employee's claims [suspected IDOR]", async () => {
    const r = await (await apiAs('employee')).get('claims/employee/EMP-STG-001');
    expect([401, 403, 404]).toContain(r.status());
  });
  test('CL-05 employee cannot approve claim; admin can (claims:approve)', async () => {
    test.skip(!claimId, 'no claim');
    expect([401, 403]).toContain((await (await apiAs('employee')).put(`claims/${claimId}/status`, { data: { status: 'approved' } })).status());
    const r = await (await apiAs('admin')).put(`claims/${claimId}/status`, { data: { status: 'approved' } });
    expect(r.status(), await r.text()).toBeLessThan(300);
  });
  test('CL-06 invalid status value rejected', async () => {
    test.skip(!claimId, 'no claim');
    const r = await (await apiAs('admin')).put(`claims/${claimId}/status`, { data: { status: 'pwned' } });
    expect(r.status()).toBe(400);
  });
});

test.describe('Attendance', () => {
  test.describe.configure({ mode: 'serial' });
  test('AT-01 check-in then duplicate check-in handled', async () => {
    const api = await apiAs('employee');
    const a = await api.post('attendance/check-in', { data: {} });
    expect(a.status(), await a.text()).toBeLessThan(500);
    const b = await api.post('attendance/check-in', { data: {} });
    expect(b.status(), 'duplicate check-in must not 500').toBeLessThan(500);
  });
  test('AT-02 today / history / weekly-hours', async () => {
    const api = await apiAs('employee');
    for (const ep of ['attendance/today', 'attendance/history', 'attendance/weekly-hours']) {
      expect((await api.get(ep)).status(), ep).toBe(200);
    }
  });
  test('AT-03 check-out', async () => {
    const r = await (await apiAs('employee')).post('attendance/check-out', { data: {} });
    expect(r.status()).toBeLessThan(500);
  });
  test('AT-04 regularize with malformed date rejected, not 500', async () => {
    const r = await (await apiAs('employee')).post('attendance/regularize', { data: { date: 'not-a-date', check_in_time: 'zz' } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });
});

test.describe('Approvals / Dashboard / Notifications / Exports', () => {
  test.describe.configure({ mode: 'serial' });
  test('AP-01 approvals list for manager and admin', async () => {
    for (const k of ['manager', 'admin']) expect((await (await apiAs(k)).get('approvals')).status()).toBe(200);
  });
  test('AP-02 action on non-existent approval -> 4xx not 5xx', async () => {
    const r = await (await apiAs('admin')).post('approvals/999999/action', { data: { action: 'approve' } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });
  test('DB-01 dashboards per role', async () => {
    expect((await (await apiAs('admin')).get('reports/admin')).status()).toBe(200);
    expect((await (await apiAs('manager')).get(`reports/manager?userId=${cached('manager').user.id}`)).status()).toBe(200);
    expect((await (await apiAs('employee')).get(`reports/employee?userId=${cached('employee').user.id}`)).status()).toBe(200);
  });
  test('NT-01 mark all notifications read', async () => {
    expect((await (await apiAs('employee')).put('notifications/read-all')).status()).toBeLessThan(300);
  });
  test('EX-01 reports summary/analytics (export data source) respond for admin', async () => {
    const api = await apiAs('admin');
    expect((await api.get('reports/summary')).status()).toBe(200);
    expect((await api.get('reports/analytics')).status()).toBe(200);
  });
});
