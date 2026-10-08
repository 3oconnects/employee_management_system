// Safety: refuse to run against anything that is not loopback. Never reads server/.env.
export const API_URL = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';
export const CLIENT_URL = process.env.E2E_CLIENT_URL || 'http://localhost:5173';
export const DOMAIN = process.env.E2E_EMAIL_DOMAIN || 'ems-staging.example.test';
export const PASSWORD = process.env.E2E_SEED_PASSWORD || '';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
for (const u of [API_URL, CLIENT_URL]) {
  if (!LOOPBACK.has(new URL(u).hostname)) {
    throw new Error(`SAFETY: refusing non-loopback target ${new URL(u).hostname}`);
  }
}
export const emailFor = (key: string) => `${key}@${DOMAIN}`;
export type RoleKey = 'admin' | 'hr' | 'manager' | 'employee';
