import { defineConfig, devices } from '@playwright/test';
import './helpers/env';

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/test-results',
  globalSetup: './helpers/global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1, // server authLimiter = 10 auth requests / 15 min / IP; keep traffic deterministic
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'artifacts/html-report', open: 'never' }],
    ['json', { outputFile: 'artifacts/results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_CLIENT_URL || 'http://localhost:5173',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'on',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
