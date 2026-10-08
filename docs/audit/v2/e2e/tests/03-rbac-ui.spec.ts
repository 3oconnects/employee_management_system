import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../helpers/auth';

// Tokens live in memory only (authStore persists user/flags to sessionStorage, not tokens),
// so a hard page.goto() after login drops the session. Navigate client-side instead.
const spa = (page: Page, url: string) =>
  page.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); }, url);

test.describe('UI route guards', () => {
  for (const p of ['/dashboard', '/employees', '/attendance', '/leave', '/payroll', '/approvals', '/settings', '/profile']) {
    test(`GUEST direct URL ${p} -> /login`, async ({ page }) => {
      await page.goto(p);
      await expect(page).toHaveURL(/login/);
    });
  }
  for (const p of ['/reports', '/onboarding', '/organization', '/audit-logs', '/settings', '/employees', '/approvals']) {
    test(`EMPLOYEE in-app URL ${p} -> /unauthorized`, async ({ page }) => {
      await loginAs(page, 'employee');
      await spa(page, p);
      await expect(page).toHaveURL(/unauthorized/);
    });
  }
  test('MANAGER blocked from /reports, /settings, /audit-logs in-app (note: /payroll is a self-service page for managers by design)', async ({ page }) => {
    await loginAs(page, 'manager');
    for (const p of ['/reports', '/settings', '/audit-logs']) {
      await spa(page, p);
      await expect(page).toHaveURL(/unauthorized/);
      await spa(page, '/dashboard');
      await expect(page).toHaveURL(/dashboard/);
    }
  });
  test('EMPLOYEE navigation has no Employees link', async ({ page }) => {
    await loginAs(page, 'employee');
    await expect(page.getByRole('link', { name: /^employees$/i })).toHaveCount(0);
  });
  test('ADMIN can open employees list', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.getByRole('link', { name: /employees/i }).first().click();
    await expect(page).toHaveURL(/employees/);
    await expect(page.getByRole('button', { name: /add employee/i })).toBeVisible();
  });
});
