import { inject } from 'vitest';
import { JwtService } from '../../src/core/security/jwt.service';
import type { UserRole } from '../../src/types';
import type { SeededUser } from './seed';

// Test-side helpers for integration tests. Users are seeded once by the
// global setup and handed over with provide/inject.

declare module 'vitest' {
    export interface ProvidedContext {
        seededUsers: Record<string, SeededUser>;
    }
}

export const seededUsers = (): Record<string, SeededUser> => inject('seededUsers');

/** Issues an access token exactly as AuthService.login() would for this user. */
export function tokenFor(u: SeededUser): string {
    return JwtService.generateAccessToken({
        userId: u.userId,
        email: u.email,
        tenantId: u.tenantId,
        role: u.roleName as UserRole,
        dashboard_type: u.dashboardType,
        permissions: u.permissions,
    });
}
