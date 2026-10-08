import { defineConfig } from 'vitest/config';

// ============================================================================
// EMS TEST CONFIGURATION (Release 0 — B0-03)
// ============================================================================
// config/db.ts calls dotenv.config(), which loads server/.env. dotenv never
// overrides variables that are already set, so every variable that could reach
// a real database, mailbox or token signer is pre-set here to an inert value.
// ============================================================================

const UNREACHABLE_DB = 'postgresql://nobody@127.0.0.1:1/unreachable?sslmode=disable';

const inertEnv = {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-access-secret-not-for-any-real-environment',
    JWT_REFRESH_SECRET: 'test-only-refresh-secret-not-for-any-real-environment',
    APP_URL: 'http://localhost:5173',
    APP_LOGO_URL: '',
    GMAIL_USER: '',
    GMAIL_APP_PASSWORD: '',
    SMTP_HOST: '',
    SMTP_PORT: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    SENTRY_DSN: '',
};

const testDbUrl = process.env.TEST_DATABASE_URL || '';

export default defineConfig({
    test: {
        environment: 'node',
        // Integration files share one database; never run test files concurrently.
        fileParallelism: false,
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['test/unit/**/*.test.ts'],
                    env: { ...inertEnv, DATABASE_URL: UNREACHABLE_DB, DIRECT_URL: UNREACHABLE_DB, DB_SSL_DISABLE: 'true' },
                },
            },
            {
                test: {
                    name: 'integration',
                    include: ['test/integration/**/*.test.ts'],
                    globalSetup: ['test/setup/integration.global.ts'],
                    env: {
                        ...inertEnv,
                        DATABASE_URL: testDbUrl || UNREACHABLE_DB,
                        DIRECT_URL: testDbUrl || UNREACHABLE_DB,
                        DB_SSL_DISABLE: 'true',
                    },
                },
            },
        ],
    },
});
