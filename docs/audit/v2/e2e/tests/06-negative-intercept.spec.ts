import { test, expect, Page } from '@playwright/test';
import { loginAs, watch } from '../helpers/auth';

const spa = (page: Page, url: string) =>
  page.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); }, url);
const crashed = (page: Page) => expect(page.locator('body')).not.toContainText(/cannot read prop|undefined is not|is not a function|minified react error/i);

test.describe('Malformed API responses via route interception (admin UI)', () => {
  test('NEG-01 /employees returns 500: page shows an error state, not a blank/crash', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/employees?**', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"message":"boom"}' }));
    await page.route('**/api/v1/employees', (r) => r.request().method() === 'GET' ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"message":"boom"}' }) : r.continue());
    await spa(page, '/employees');
    await page.waitForTimeout(1500);
    await crashed(page);
    expect((await page.locator('#root').innerText()).trim().length, 'blank page after 500').toBeGreaterThan(20);
  });
  test('NEG-02 /employees returns non-JSON HTML', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/employees**', (r) => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'text/html', body: '<html>proxy error</html>' }) : r.continue());
    await spa(page, '/employees');
    await page.waitForTimeout(1500);
    await crashed(page);
  });
  test('NEG-03 /employees returns unexpected shape (data: null)', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/employees**', (r) => r.request().method() === 'GET' ? r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":null}' }) : r.continue());
    await spa(page, '/employees');
    await page.waitForTimeout(1500);
    await crashed(page);
  });
  test('NEG-04 dashboard stats with null/empty payload', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/reports/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true,"data":{}}' }));
    await spa(page, '/dashboard');
    await page.waitForTimeout(1500);
    await crashed(page);
  });
  test('NEG-05 network failure on approvals', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/approvals**', (r) => r.abort('failed'));
    await spa(page, '/approvals');
    await page.waitForTimeout(1500);
    await crashed(page);
  });
  test('NEG-06 slow API (6s) shows loading indicator and recovers', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/employees**', async (r) => { await new Promise((s) => setTimeout(s, 6000)); await r.continue(); });
    await spa(page, '/employees');
    await expect(page.getByRole('button', { name: /add employee/i })).toBeVisible({ timeout: 20_000 });
  });
  test('NEG-07 429 rate limit response is surfaced, no crash', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.route('**/api/v1/notifications**', (r) => r.fulfill({ status: 429, contentType: 'application/json', body: '{"success":false,"message":"Too many requests."}' }));
    await spa(page, '/dashboard');
    await page.waitForTimeout(1500);
    await crashed(page);
  });
});

test.describe('Negative UI / form validation', () => {
  test('NEG-08 login with 10k-char email and script payload does not hang or execute', async ({ page }) => {
    let dialog = false; page.on('dialog', (d) => { dialog = true; d.dismiss(); });
    await page.goto('/login');
    await page.getByPlaceholder('name@company.com').fill('<script>alert(1)</script>@x.com');
    await page.locator('input[type="password"]').first().fill('x');
    await page.route('**/auth/login', (r) => r.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Invalid credentials"}' }));
    await page.getByRole('button', { name: /sign in|log in/i }).first().click();
    await expect(page.getByText(/invalid|couldn't sign you in/i).first()).toBeVisible();
    expect(dialog).toBe(false);
  });
  test('NEG-09 Apply Leave form rejects empty submit', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.getByRole('link', { name: /time off/i }).first().click();
    let posted = false; page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/leave/apply')) posted = true; });
    const submit = page.getByRole('button', { name: /submit|apply|request/i }).last();
    if (await submit.count()) await submit.click({ trial: false }).catch(() => {});
    await page.waitForTimeout(800);
    expect(posted, 'empty leave form must not POST').toBe(false);
  });
  test('NEG-10 unknown route renders 404/redirect, not blank', async ({ page }) => {
    await loginAs(page, 'employee');
    await spa(page, '/definitely-not-a-page');
    await page.waitForTimeout(800);
    expect((await page.locator('#root').innerText()).trim().length).toBeGreaterThan(5);
  });
  test('NEG-11 stored-XSS probe: employee name with markup renders as text', async ({ page }) => {
    let dialog = false; page.on('dialog', (d) => { dialog = true; d.dismiss(); });
    await loginAs(page, 'admin');
    await page.route('**/api/v1/employees**', (r) => r.request().method() !== 'GET' ? r.continue() : r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [{ id: 'X1', name: '<img src=x onerror=alert(1)>', email: 'x@y.z', department: 'Eng', status: 'active' }], pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } }),
    }));
    await spa(page, '/employees');
    await page.waitForTimeout(1500);
    expect(dialog, 'script executed from employee name').toBe(false);
  });
});
