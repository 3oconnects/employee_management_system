/**
 * Security Remediation — Unit & Security Test Suite
 *
 * Release Security-1:
 *   - ARC-08: JWT query parameter restricted to SSE (authenticateRealtime), authenticate is Bearer-only
 *   - ARC-01: Profile ownership hardening (no id, userId, tenantId, role, permissions from body)
 *   - isEmployeeOwner: signature and tenant-scoping verification
 *   - Force password change: server enforcement on temporary passwords
 *
 * Release Security-2:
 *   - ARC-02: Employee deletion tenant isolation with row-level lock (FOR UPDATE)
 *   - Retention policy: soft-delete for audit-sensitive records (approvals, payroll_history, claims, attendance, leave_requests)
 *
 * Release Security-3:
 *   - ARC-03: Refresh token validation against DB
 *   - Refresh token SHA-256 hashing
 *   - Logout & revocation validation
 *
 * Release Security-4:
 *   - ARC-07: Plaintext temp_password removed from authentication path
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── RELEASE SECURITY-1: ARC-08 authenticate header-only & authenticateRealtime ──

describe('Release Security-1 — ARC-08 authenticate vs authenticateRealtime', () => {
    const mockNext = vi.fn();
    const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should reject requests to authenticate() that provide only a query ?token= parameter', async () => {
        const { authenticate } = await import('../../src/core/security/authorize');

        const req = {
            headers: { authorization: undefined },
            query: { token: 'some.jwt.token' },
        } as any;

        authenticate(req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept requests to authenticate() with a valid Authorization: Bearer header', async () => {
        const { authenticate } = await import('../../src/core/security/authorize');
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateAccessToken({
            userId: 1,
            email: 'test@test.com',
            tenantId: 'tenant_test',
            role: 'employee' as any,
            permissions: [],
        });

        const req = {
            headers: { authorization: `Bearer ${token}` },
            query: {},
        } as any;

        authenticate(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });

    it('authenticateRealtime should accept ?token= query parameter for SSE stream', async () => {
        const { authenticateRealtime } = await import('../../src/core/security/authorize');
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const nextFn = vi.fn();
        const token = JwtService.generateAccessToken({
            userId: 1,
            email: 'sse@test.com',
            tenantId: 'tenant_test',
            role: 'employee' as any,
            permissions: [],
        });

        const req = {
            headers: {},
            query: { token },
        } as any;

        authenticateRealtime(req, mockRes, nextFn);
        expect(nextFn).toHaveBeenCalled();
    });
});

// ─── RELEASE SECURITY-1: Force Password Change Server Enforcement ─────────────

describe('Release Security-1 — Force Password Change Server Enforcement', () => {
    it('should block regular API requests if user has temporary password', async () => {
        const { authenticate } = await import('../../src/core/security/authorize');
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateAccessToken({
            userId: 10,
            email: 'temp@test.com',
            tenantId: 'tenant_test',
            role: 'employee' as any,
            permissions: [],
            is_password_temp: true,
        });

        const mockNext = vi.fn();
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        const req = {
            headers: { authorization: `Bearer ${token}` },
            query: {},
            originalUrl: '/api/employees',
            method: 'GET',
        } as any;

        authenticate(req, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                code: 'FORCE_PASSWORD_CHANGE',
            })
        );
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow password change route even if user has temporary password', async () => {
        const { authenticate } = await import('../../src/core/security/authorize');
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateAccessToken({
            userId: 10,
            email: 'temp@test.com',
            tenantId: 'tenant_test',
            role: 'employee' as any,
            permissions: [],
            is_password_temp: true,
        });

        const mockNext = vi.fn();
        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        } as any;

        const req = {
            headers: { authorization: `Bearer ${token}` },
            query: {},
            originalUrl: '/api/auth/me/password',
            method: 'PUT',
        } as any;

        authenticate(req, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
});

// ─── RELEASE SECURITY-1: ARC-01 Profile Schema & Ownership ─────────────────────

describe('Release Security-1 — ARC-01 updateProfileSchema', () => {
    it('should parse a valid profile without id', async () => {
        const { updateProfileSchema } = await import('../../src/modules/users/users.schema');

        const result = updateProfileSchema.safeParse({
            name: 'Alice',
            email: 'alice@example.com',
            phone: '1234567890',
        });

        expect(result.success).toBe(true);
    });

    it('should parse first_name and last_name as valid profile', async () => {
        const { updateProfileSchema } = await import('../../src/modules/users/users.schema');

        const result = updateProfileSchema.safeParse({
            first_name: 'Alice',
            last_name: 'Smith',
            phone: '1234567890',
        });

        expect(result.success).toBe(true);
    });

    it('should not contain id, userId, tenantId, role, permissions in schema shape', async () => {
        const { updateProfileSchema } = await import('../../src/modules/users/users.schema');

        const shape = (updateProfileSchema as any).shape;
        expect(shape).not.toHaveProperty('id');
        expect(shape).not.toHaveProperty('userId');
        expect(shape).not.toHaveProperty('tenantId');
        expect(shape).not.toHaveProperty('role');
        expect(shape).not.toHaveProperty('permissions');
    });

    it('should reject a profile with missing name and first_name', async () => {
        const { updateProfileSchema } = await import('../../src/modules/users/users.schema');

        const result = updateProfileSchema.safeParse({
            email: 'test@example.com',
        });

        expect(result.success).toBe(false);
    });
});

// ─── RELEASE SECURITY-2: ARC-02 Tenant Isolation & Retention ───────────────────

describe('Release Security-2 — ARC-02 EmployeesRepository.delete tenant isolation & retention', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should return false immediately when employee belongs to a different tenant', async () => {
        const mockClient = {
            query: vi.fn().mockImplementation(async (sql: string) => {
                if (sql.includes('SELECT id, email')) {
                    // Ownership check: employee not in this tenant
                    return { rowCount: 0, rows: [] };
                }
                return { rowCount: 0, rows: [] };
            }),
            release: vi.fn(),
        };

        vi.doMock('../../src/config/db', () => ({
            pool: {
                connect: vi.fn().mockResolvedValue(mockClient),
                query: vi.fn(),
            },
        }));

        const { EmployeesRepository } = await import('../../src/modules/employees/employees.repository');
        const repo = new EmployeesRepository();

        const result = await repo.delete('EMP001', 'different-tenant');
        expect(result).toBe(false);

        // Verification: BEGIN was called, but no child mutations were issued
        const calls = mockClient.query.mock.calls.map((c: any) => c[0]);
        expect(calls.some((sql: string) => sql.includes('BEGIN'))).toBe(true);
        expect(calls.some((sql: string) => sql.includes('DELETE FROM employee_education'))).toBe(false);
    });

    it('should lock row with FOR UPDATE and soft-delete audit-sensitive tables', async () => {
        const queryCalls: string[] = [];
        const mockClient = {
            query: vi.fn().mockImplementation(async (sql: string) => {
                queryCalls.push(sql);
                if (sql.includes('SELECT id, email')) {
                    return {
                        rowCount: 1,
                        rows: [{ id: 'EMP001', email: 'emp@test.com', user_id: 10, manager_id: null, reporting_manager_id: null }]
                    };
                }
                if (sql.includes('DELETE FROM employees') || sql.includes('UPDATE employees')) {
                    return { rowCount: 1, rows: [{ id: 'EMP001' }] };
                }
                return { rowCount: 1, rows: [] };
            }),
            release: vi.fn(),
        };

        vi.doMock('../../src/config/db', () => ({
            pool: {
                connect: vi.fn().mockResolvedValue(mockClient),
                query: vi.fn(),
            },
        }));

        const { EmployeesRepository } = await import('../../src/modules/employees/employees.repository');
        const repo = new EmployeesRepository();

        const result = await repo.delete('EMP001', 'tenant_123');
        expect(result).toBe(true);

        // 1. Verification of FOR UPDATE lock
        const selectCall = queryCalls.find(sql => sql.includes('SELECT id, email'));
        expect(selectCall).toContain('FOR UPDATE');

        // 2. Verification of soft-delete retention on audit-sensitive tables
        expect(queryCalls.some(sql => sql.includes('UPDATE leave_requests SET deleted_at = NOW()'))).toBe(true);
        expect(queryCalls.some(sql => sql.includes('UPDATE approvals SET deleted_at = NOW()'))).toBe(true);
        expect(queryCalls.some(sql => sql.includes('UPDATE payroll_history SET deleted_at = NOW()'))).toBe(true);
        expect(queryCalls.some(sql => sql.includes('UPDATE claims SET deleted_at = NOW()'))).toBe(true);
        expect(queryCalls.some(sql => sql.includes('UPDATE attendance SET deleted_at = NOW()'))).toBe(true);

        // 3. Verification that physical DELETE was NOT called on audit-sensitive tables
        expect(queryCalls.some(sql => sql.includes('DELETE FROM leave_requests'))).toBe(false);
        expect(queryCalls.some(sql => sql.includes('DELETE FROM approvals'))).toBe(false);
        expect(queryCalls.some(sql => sql.includes('DELETE FROM payroll_history'))).toBe(false);
        expect(queryCalls.some(sql => sql.includes('DELETE FROM claims'))).toBe(false);
        expect(queryCalls.some(sql => sql.includes('DELETE FROM attendance'))).toBe(false);
    });
});

// ─── RELEASE SECURITY-3: ARC-03 Refresh Token Validation & Hashing ────────────

describe('Release Security-3 — ARC-03 Refresh Token DB validation & hashing', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should reject a refresh token that does not match the stored DB hash', async () => {
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateRefreshToken({ userId: 42, tenantId: 'tenant_test' });

        vi.doMock('../../src/modules/auth/auth.repository', () => ({
            AuthRepository: class {
                async findUserById() {
                    return {
                        id: 42,
                        email: 'test@test.com',
                        tenant_id: 'tenant_test',
                        role: 'employee',
                        role_id: 4,
                        dashboard_type: 'employee',
                        is_active: true,
                        refresh_token: 'different_hash_value',
                    };
                }
                async findRolePermissions() { return []; }
                async updateRefreshToken() {}
            },
        }));

        const { AuthService } = await import('../../src/modules/auth/auth.service');
        const service = new AuthService();

        await expect(service.refresh(token)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it('should reject refresh when stored token is NULL (logged out / revoked)', async () => {
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateRefreshToken({ userId: 42, tenantId: 'tenant_test' });

        vi.doMock('../../src/modules/auth/auth.repository', () => ({
            AuthRepository: class {
                async findUserById() {
                    return {
                        id: 42,
                        email: 'test@test.com',
                        tenant_id: 'tenant_test',
                        role: 'employee',
                        role_id: 4,
                        dashboard_type: 'employee',
                        is_active: true,
                        refresh_token: null, // logged out
                    };
                }
                async findRolePermissions() { return []; }
                async updateRefreshToken() {}
            },
        }));

        const { AuthService } = await import('../../src/modules/auth/auth.service');
        const service = new AuthService();

        await expect(service.refresh(token)).rejects.toMatchObject({
            statusCode: 401,
        });
    });

    it('should successfully refresh when submitted token hash matches stored DB hash', async () => {
        const crypto = await import('crypto');
        const { JwtService } = await import('../../src/core/security/jwt.service');

        const token = JwtService.generateRefreshToken({ userId: 42, tenantId: 'tenant_test' });
        const hashed = crypto.createHash('sha256').update(token).digest('hex');

        let storedToken = hashed;
        vi.doMock('../../src/modules/auth/auth.repository', () => ({
            AuthRepository: class {
                async findUserById() {
                    return {
                        id: 42,
                        email: 'test@test.com',
                        tenant_id: 'tenant_test',
                        role: 'employee',
                        role_id: 4,
                        dashboard_type: 'employee',
                        is_active: true,
                        refresh_token: storedToken,
                    };
                }
                async findRolePermissions() { return ['profile:view']; }
                async updateRefreshToken(_id: number, newToken: string) {
                    storedToken = newToken;
                }
            },
        }));

        const { AuthService } = await import('../../src/modules/auth/auth.service');
        const service = new AuthService();

        const result = await service.refresh(token);
        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        // Old token should now be rotated and replaced in storedToken
        expect(storedToken).not.toBe(hashed);
    });
});

// ─── RELEASE SECURITY-4: ARC-07 Login Without Plaintext Fallback ──────────────

describe('Release Security-4 — ARC-07 AuthService.login without plaintext fallback', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('should reject login with plaintext temp_password if bcrypt hash does not match', async () => {
        const plaintext = 'TEMP_PW_123';

        vi.doMock('../../src/modules/auth/auth.repository', () => ({
            AuthRepository: class {
                async findUserByEmail() {
                    return {
                        id: 1,
                        email: 'user@test.com',
                        tenant_id: 'tenant_test',
                        role: 'employee',
                        role_id: 4,
                        dashboard_type: 'employee',
                        is_active: true,
                        password: '$2b$10$somethingElseThatDoesNotMatchHash',
                        temp_password: plaintext, // legacy row with plaintext stored
                        is_password_temp: true,
                    };
                }
                async findRolePermissions() { return []; }
                async updateRefreshToken() {}
            },
        }));

        const { AuthService } = await import('../../src/modules/auth/auth.service');
        const service = new AuthService();

        // Plaintext fallback has been removed — must reject with 401
        await expect(service.login('user@test.com', plaintext)).rejects.toMatchObject({
            statusCode: 401,
        });
    });
});
