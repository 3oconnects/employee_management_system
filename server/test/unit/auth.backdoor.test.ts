import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// HF-1: the legacy master password for admin@company.com must not authenticate.
// The repository is mocked (no database). The mocked admin account has a REAL
// stored password hash that is different from the known backdoor passwords, so a
// 200 here can only come from a bypass in the login code, never from the data.

const REAL_ADMIN_PASSWORD = 'Str0ng-Unique-Passw0rd!';
const adminUser = {
    id: 1,
    tenant_id: 'tenant_default',
    name: 'System Admin',
    email: 'admin@company.com',
    password: bcrypt.hashSync(REAL_ADMIN_PASSWORD, 4),
    temp_password: null,
    is_password_temp: false,
    role: 'admin',
    role_id: 7,
    dashboard_type: 'admin',
};

const { findUserByEmail, findRolePermissions, updateRefreshToken } = vi.hoisted(() => ({
    findUserByEmail: vi.fn(),
    findRolePermissions: vi.fn(),
    updateRefreshToken: vi.fn(),
}));
vi.mock('../../src/modules/auth/auth.repository', () => ({
    AuthRepository: vi.fn().mockImplementation(() => ({ findUserByEmail, findRolePermissions, updateRefreshToken })),
}));

import app from '../../src/app';

const login = (email: string, password: string) =>
    request(app).post('/api/v1/auth/login').send({ email, password });

describe('HF-1: master password backdoor is removed', () => {
    beforeEach(() => {
        findUserByEmail.mockReset().mockResolvedValue(adminUser);
        findRolePermissions.mockReset().mockResolvedValue([]);
        updateRefreshToken.mockReset().mockResolvedValue(undefined);
    });

    it('admin@company.com + admin123 -> 401', async () => {
        const res = await login('admin@company.com', 'admin123');
        expect(res.status).toBe(401);
        expect(res.body.accessToken).toBeUndefined();
        expect(updateRefreshToken).not.toHaveBeenCalled();
    });

    it('admin@company.com + Admin@123 -> 401', async () => {
        const res = await login('admin@company.com', 'Admin@123');
        expect(res.status).toBe(401);
        expect(res.body.accessToken).toBeUndefined();
        expect(updateRefreshToken).not.toHaveBeenCalled();
    });

    it('the email casing does not re-enable the bypass', async () => {
        const res = await login('Admin@Company.com', 'admin123');
        expect(res.status).toBe(401);
        expect(updateRefreshToken).not.toHaveBeenCalled();
    });

    it('the admin account still signs in with its real stored password', async () => {
        const res = await login('admin@company.com', REAL_ADMIN_PASSWORD);
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toEqual(expect.any(String));
        expect(updateRefreshToken).toHaveBeenCalledTimes(1);
    });

    it('a different account with the correct password is unaffected', async () => {
        findUserByEmail.mockResolvedValue({
            ...adminUser,
            id: 2,
            email: 'priya@company.com',
            role: 'hr',
            dashboard_type: 'employee',
            password: bcrypt.hashSync('Another-Passw0rd!', 4),
        });
        const res = await login('priya@company.com', 'Another-Passw0rd!');
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('priya@company.com');
    });

    it('a wrong password is still rejected', async () => {
        const res = await login('admin@company.com', 'not-the-password');
        expect(res.status).toBe(401);
    });
});
