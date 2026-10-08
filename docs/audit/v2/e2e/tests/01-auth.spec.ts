import { test, expect } from '@playwright/test';
import { emailFor } from '../helpers/env';
import { guestApi, loginAs, cached } from '../helpers/auth';

test.describe('Auth', () => {
  test('AUTH-01 login form client-side validation (no request sent)', async ({ page }) => {
    let hit = 0;
    await page.route('**/auth/login', (r) => { hit++; r.abort(); });
    await page.goto('/login');
    await page.getByPlaceholder('name@company.com').fill('not-an-email');
    await page.locator('input[type="password"]').first().fill('');
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page.getByText(/valid email|enter your password/i).first()).toBeVisible();
    expect(hit).toBe(0);
  });

  test('AUTH-02 invalid credentials rejected via API (real server) with 401 and no token', async () => {
    const api = await guestApi();
    const r = await api.post('auth/login', { data: { email: emailFor('admin'), password: 'Wrong-password-123!' } });
    expect(r.status()).toBe(401);
    expect(JSON.stringify(await r.json())).not.toMatch(/token/i);
  });

  test('AUTH-03 unknown user and wrong password give same status/message (no enumeration)', async () => {
    const api = await guestApi();
    const a = await api.post('auth/login', { data: { email: 'nobody@ems-staging.example.test', password: 'Wrong-password-123!' } });
    const b = await api.post('auth/login', { data: { email: emailFor('employee'), password: 'Wrong-password-123!' } });
    expect(a.status()).toBe(b.status());
    expect((await a.json()).message).toBe((await b.json()).message);
  });

  test('AUTH-04 UI login lands on dashboard, logout returns to /login and guards routes', async ({ page }) => {
    await loginAs(page, 'employee');
    await expect(page).toHaveURL(/dashboard/);
    await page.locator('header button:has(svg.lucide-chevron-down)').first().click();
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('AUTH-05 session expiry: 401 on every API call + failed refresh sends user to /login', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.route('**/api/v1/**', (r) => {
      if (r.request().url().includes('/auth/login')) return r.continue();
      return r.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Token expired' }) });
    });
    await page.evaluate(() => { history.pushState({}, '', '/attendance'); dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page).toHaveURL(/login/, { timeout: 15_000 });
  });

  test('AUTH-06 /auth/me without token = 401; with garbage token = 401', async () => {
    const api = await guestApi();
    expect((await api.get('auth/me')).status()).toBe(401);
    expect((await api.get('auth/me', { headers: { Authorization: 'Bearer abc.def.ghi' } })).status()).toBe(401);
  });

  test('AUTH-07 forgot-password: identical body for existing/non-existing email, no token leaked', async () => {
    const api = await guestApi();
    const a = await api.post('auth/forgot-password', { data: { email: emailFor('employee') } });
    const b = await api.post('auth/forgot-password', { data: { email: 'ghost@ems-staging.example.test' } });
    expect(a.status()).toBe(b.status());
    expect(await a.json()).toEqual(await b.json());
    expect(JSON.stringify(await a.json())).not.toMatch(/token|resetUrl/i);
  });

  test('AUTH-08 reset-password with forged token is rejected', async () => {
    const api = await guestApi();
    const r = await api.post('auth/reset-password', { data: { token: 'x'.repeat(64), email: emailFor('employee'), newPassword: 'NewPassw0rd!234' } });
    expect(r.status()).not.toBe(200);
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AUTH-09 refresh with invalid refresh token is rejected', async () => {
    const r = await (await guestApi()).post('auth/refresh', { data: { refreshToken: 'bogus' } });
    expect(r.status()).toBeGreaterThanOrEqual(400);
  });

  test('AUTH-10 login response never contains a password hash', async () => {
    const c = cached('employee');
    expect(JSON.stringify(c)).not.toMatch(/\$2[aby]\$/);
    expect(JSON.stringify(c.user)).not.toMatch(/password/i);
  });

  test('AUTH-11 (observation) dev login page pre-fills demo credentials', async ({ page }) => {
    await page.goto('/login');
    const email = await page.getByPlaceholder('name@company.com').inputValue();
    test.info().annotations.push({ type: 'observation', description: `prefilled email="${email}"` });
    expect(email).toBe(''); // expected to FAIL under `vite dev` (DEV_ACCOUNTS prefill; stripped in prod build)
  });
});
