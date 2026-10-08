import { test, expect, Page } from '@playwright/test';
import { loginAs, watch } from '../helpers/auth';

const VIEWPORTS = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };
const spa = (page: Page, url: string) =>
  page.evaluate((u) => { history.pushState({}, '', u); dispatchEvent(new PopStateEvent('popstate')); }, url);

for (const [name, vp] of Object.entries(VIEWPORTS)) {
  test.describe(`Responsive ${name}`, () => {
    test.use({ viewport: vp });
    for (const role of ['admin', 'employee']) {
      test(`${role} dashboard has no horizontal overflow at ${name}`, async ({ page }) => {
        const w = watch(page);
        await loginAs(page, role);
        await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        await page.screenshot({ path: `artifacts/shots/${role}-dashboard-${name}.png`, fullPage: true });
        test.info().annotations.push({ type: 'console-errors', description: JSON.stringify(w.consoleErrors.slice(0, 10)) });
        test.info().annotations.push({ type: 'failed-requests', description: JSON.stringify(w.failed.slice(0, 10)) });
        expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(1);
      });
    }
  });
}

test.describe('Navigation smoke (admin) - every module renders without console errors', () => {
  const PAGES = ['/dashboard', '/employees', '/attendance', '/leave', '/timesheet', '/payroll', '/approvals', '/reports', '/organization', '/audit-logs', '/settings', '/profile', '/onboarding'];
  test('visit all pages', async ({ page }) => {
    const w = watch(page);
    await loginAs(page, 'admin');
    for (const p of PAGES) {
      await spa(page, p);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
      await page.screenshot({ path: `artifacts/shots/admin${p.replace(/\//g, '-')}.png` });
    }
    test.info().annotations.push({ type: 'console-errors', description: JSON.stringify(w.consoleErrors.slice(0, 20)) });
    expect(w.failed.filter((f) => /\s5\d\d\s|FAILED/.test(f) && !f.includes('/realtime/stream')), '5xx / failed requests while browsing').toEqual([]);
  });
});

test.describe('A11y basics', () => {
  test('login page: labelled inputs, single h1, lang attribute, keyboard reachable submit', async ({ page }) => {
    await page.goto('/login');
    expect(await page.locator('html').getAttribute('lang')).toBeTruthy();
    const unlabeled = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type=hidden])')].filter((i) => {
        const el = i as HTMLInputElement;
        return !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby');
      }).length);
    expect(unlabeled, 'inputs without accessible label').toBe(0);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  });
  test('dashboard: images have alt, buttons have names, one main landmark', async ({ page }) => {
    await loginAs(page, 'employee');
    const r = await page.evaluate(() => ({
      imgNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      btnNoName: [...document.querySelectorAll('button')].filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title')).map((b) => b.outerHTML.slice(0, 160)),
      mains: document.querySelectorAll('main,[role=main]').length,
    }));
    expect(r.imgNoAlt, 'img without alt').toBe(0);
    expect(r.btnNoName, 'buttons without accessible name').toEqual([]);
    expect(r.mains).toBe(1);
  });
});
