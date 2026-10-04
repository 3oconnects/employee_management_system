import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { loadEnv, MIN_JWT_SECRET_LENGTH } from '../../src/config/env';
import { JwtService } from '../../src/core/security/jwt.service';

// HF-2: there must be no way to start with default / weak / shared JWT secrets.
// The values below are test-only and are never used outside this file.

const ACCESS = 'unit-test-access-secret-0123456789abcdef';
const REFRESH = 'unit-test-refresh-secret-0123456789abcdef';
const valid = { JWT_SECRET: ACCESS, JWT_REFRESH_SECRET: REFRESH };

describe('HF-2: JWT secret configuration fails closed', () => {
    it('accepts explicitly configured, long, distinct secrets', () => {
        const cfg = loadEnv({ ...valid, NODE_ENV: 'production' });
        expect(cfg.JWT_SECRET).toBe(ACCESS);
        expect(cfg.JWT_REFRESH_SECRET).toBe(REFRESH);
    });

    it.each(['production', 'development', 'test', undefined])(
        'refuses to load with no secrets (NODE_ENV=%s)',
        (nodeEnv) => {
            expect(() => loadEnv({ NODE_ENV: nodeEnv })).toThrow(/JWT_SECRET.*JWT_REFRESH_SECRET|JWT_REFRESH_SECRET.*JWT_SECRET/s);
        },
    );

    it('refuses when only the access secret is missing', () => {
        expect(() => loadEnv({ JWT_REFRESH_SECRET: REFRESH })).toThrow(/JWT_SECRET must be set/);
    });

    it('refuses when only the refresh secret is missing', () => {
        expect(() => loadEnv({ JWT_SECRET: ACCESS })).toThrow(/JWT_REFRESH_SECRET must be set/);
    });

    it('refuses the former built-in defaults', () => {
        expect(() => loadEnv({ JWT_SECRET: 'ems_secret', JWT_REFRESH_SECRET: 'ems_refresh_secret' })).toThrow(
            /JWT_SECRET must be set/,
        );
    });

    it('enforces the minimum length exactly', () => {
        const short = 'a'.repeat(MIN_JWT_SECRET_LENGTH - 1);
        const exact = 'b'.repeat(MIN_JWT_SECRET_LENGTH);
        expect(() => loadEnv({ JWT_SECRET: short, JWT_REFRESH_SECRET: REFRESH })).toThrow(/JWT_SECRET must be set/);
        expect(() => loadEnv({ JWT_SECRET: ACCESS, JWT_REFRESH_SECRET: short })).toThrow(/JWT_REFRESH_SECRET must be set/);
        expect(loadEnv({ JWT_SECRET: exact, JWT_REFRESH_SECRET: REFRESH }).JWT_SECRET).toBe(exact);
    });

    it('refuses an empty string', () => {
        expect(() => loadEnv({ JWT_SECRET: '', JWT_REFRESH_SECRET: REFRESH })).toThrow(/JWT_SECRET must be set/);
    });

    it('refuses identical access and refresh secrets', () => {
        expect(() => loadEnv({ JWT_SECRET: ACCESS, JWT_REFRESH_SECRET: ACCESS })).toThrow(/must differ from JWT_SECRET/);
    });

    it('never puts a secret value in the error message', () => {
        const weak = 'weak-secret';
        try {
            loadEnv({ JWT_SECRET: weak, JWT_REFRESH_SECRET: REFRESH });
            throw new Error('expected loadEnv to throw');
        } catch (e) {
            const message = (e as Error).message;
            expect(message).not.toContain(weak);
            expect(message).not.toContain(REFRESH);
        }
    });
});

describe('HF-2: signing paths use the validated configuration', () => {
    const payload = { userId: 1, tenantId: 't1' };

    it('access tokens verify with the configured access secret only', () => {
        const token = JwtService.generateAccessToken({ ...payload, email: 'a@b.c', role: 'employee', permissions: [] } as any);
        expect(JwtService.verifyAccessToken(token).userId).toBe(1);
        // not verifiable with the refresh secret, so the two paths are independent
        expect(() => JwtService.verifyRefreshToken(token)).toThrow();
    });

    it('refresh tokens verify with the configured refresh secret only', () => {
        const token = JwtService.generateRefreshToken(payload);
        expect(JwtService.verifyRefreshToken(token).userId).toBe(1);
        expect(() => JwtService.verifyAccessToken(token)).toThrow();
    });

    it('a token signed with the former default secret is rejected', () => {
        const forged = jwt.sign({ ...payload, role: 'super_admin' }, 'ems_secret', { expiresIn: '15m' });
        expect(() => JwtService.verifyAccessToken(forged)).toThrow();
        const forgedRefresh = jwt.sign(payload, 'ems_refresh_secret', { expiresIn: '7d' });
        expect(() => JwtService.verifyRefreshToken(forgedRefresh)).toThrow();
    });
});
