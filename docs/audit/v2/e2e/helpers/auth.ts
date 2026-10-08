import fs from 'fs';
import path from 'path';
import { Page, request, APIRequestContext, expect } from '@playwright/test';
import { API_URL } from './env';

export type Cached = { accessToken?: string; token?: string; refreshToken?: string; user: any; mustChangePassword?: boolean };
export const cached = (key: string): Cached =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.auth', `${key}.json`), 'utf8'));

/** Authenticated API context from the cached login (no extra auth-limiter hit). */
export async function apiAs(key: string): Promise<APIRequestContext> {
  const c = cached(key);
  return request.newContext({
    baseURL: API_URL + '/',
    extraHTTPHeaders: { Authorization: `Bearer ${c.accessToken || c.token}` },
  });
}
export const guestApi = () => request.newContext({ baseURL: API_URL + '/' });

/** Drives the real login form; the network reply is the cached real response for that role. */
export async function loginAs(page: Page, key: string) {
  const c = cached(key);
  await page.route('**/auth/login', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(c) }));
  await page.goto('/login');
  await page.getByPlaceholder('name@company.com').fill(c.user.email);
  await page.locator('input[type="password"]').first().fill('placeholder-not-sent');
  await page.getByRole('button', { name: /sign in|log in/i }).first().click();
  await page.waitForURL(/\/dashboard|\/change-password/);
  await page.unroute('**/auth/login');
}

/** Collect console errors + failed requests for evidence. */
export function watch(page: Page) {
  const consoleErrors: string[] = []; const failed: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  page.on('requestfailed', (r) => failed.push(`FAILED ${r.method()} ${r.url()} ${r.failure()?.errorText}`));
  return { consoleErrors, failed };
}
export { expect };
