import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// ============================================================================
// Refuses to let integration tests touch anything but a disposable test DB.
// Integration setup DROPS and recreates the `public` schema, so these guards
// are deliberately strict. Connection strings are never printed.
// ============================================================================

export function assertDisposableTestDatabase(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('TEST_DATABASE_URL is not a valid URL.');
    }

    const host = parsed.hostname.replace(/^\[|\]$/g, '');
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
    if (!isLocal && process.env.TEST_DATABASE_ALLOW_REMOTE !== '1') {
        throw new Error(
            'Refusing to run integration tests against a non-local database. ' +
            'Set TEST_DATABASE_ALLOW_REMOTE=1 only for a dedicated, disposable test database.'
        );
    }

    const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    if (!/test/i.test(dbName)) {
        throw new Error('Refusing to run: the test database name must contain "test" (e.g. ems_test).');
    }

    // Never allow the URL configured for the running app (server/.env).
    const envFile = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envFile)) {
        const appEnv = dotenv.parse(fs.readFileSync(envFile));
        const normalize = (u?: string) => (u || '').trim().replace(/\/+$/, '');
        if ([appEnv.DATABASE_URL, appEnv.DIRECT_URL].some((u) => u && normalize(u) === normalize(url))) {
            throw new Error('Refusing to run: TEST_DATABASE_URL matches the application database in server/.env.');
        }
    }
}
