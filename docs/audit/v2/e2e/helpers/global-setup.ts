import fs from 'fs';
import path from 'path';
import { API_URL, PASSWORD, emailFor } from './env';

// Logs in ONCE per role via the real API (3 of the 10 allowed auth hits per 15 min)
// and caches the responses; UI tests replay them through the real login form.
export default async function globalSetup() {
  if (process.env.E2E_SKIP_SETUP && fs.existsSync(path.join(__dirname, '..', '.auth', 'admin.json'))) return;
  if (!PASSWORD) throw new Error('E2E_SEED_PASSWORD not set (see .env.example)');
  const health = await fetch(`${API_URL}/health`).catch(() => null);
  if (!health || !health.ok) throw new Error(`API not reachable at ${API_URL}/health`);
  const dir = path.join(__dirname, '..', '.auth');
  fs.mkdirSync(dir, { recursive: true });
  for (const key of ['admin', 'manager', 'employee']) {
    const r = await fetch(`${API_URL}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailFor(key), password: PASSWORD }),
    });
    if (!r.ok) throw new Error(`seed login failed for ${key}: HTTP ${r.status}`);
    fs.writeFileSync(path.join(dir, `${key}.json`), await r.text());
  }
}
