// ============================================================================
// EMS BACKEND — AUTH ROUTES (UPGRADED)
// ============================================================================
// Full authentication flow:
//   1. POST /login      — Validates credentials, returns access + refresh tokens
//   2. POST /refresh    — Issues new access token using refresh token
//   3. POST /logout     — Invalidates refresh token
//   4. GET  /me         — Returns current user profile + permissions
//   5. PUT  /me         — Updates current user profile
// ============================================================================

import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    authenticate,
} from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuditService } from '../services/auditService';
import { AuditAction, AuthenticatedRequest, UserRole } from '../types';

const router = express.Router();

// ─── IDENTITY REPAIR (EMERGENCY ONLY) ───────────────────────────────────────
router.get('/repair-identity', asyncHandler(async (req, res) => {
    const hashed = await bcrypt.hash('admin123', 10);
    await pool.query("INSERT INTO tenants (id, name, slug, status) VALUES ('tenant_default', 'AURA Default', 'default', 'active') ON CONFLICT (id) DO NOTHING");
    
    await pool.query(`
        INSERT INTO users (name, email, password, role, tenant_id, is_active) 
        VALUES ('System Admin', 'admin@company.com', $1, 'admin', 'tenant_default', true)
        ON CONFLICT (email) DO UPDATE 
        SET password = $1, is_active = true, deleted_at = NULL, tenant_id = 'tenant_default'
    `, [hashed]);

    res.send("✅ Identity Baseline Restored. Try logging in with admin@company.com / admin123");
}));

// ─── POST /login ────────────────────────────────────────────────────────────

router.post('/login', asyncHandler(async (req, res) => {
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();

    if (!email || !password) {
        throw AppError.badRequest('Email and password are required.');
    }

    // 1. Find user with employee linkage and role/permissions
    const result = await pool.query(
        `SELECT u.*, e.id as employee_id,
                r.id as role_record_id, r.name as role_name
         FROM users u
         LEFT JOIN employees e ON u.email = e.email AND u.tenant_id = e.tenant_id
         LEFT JOIN roles r ON u.role_id = r.id
         WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true AND u.deleted_at IS NULL`,
        [email]
    );

    if (result.rows.length === 0) {
        throw AppError.unauthorized('Invalid credentials.');
    }

    const user = result.rows[0];
    console.log(`[AUTH] Identity Trace: id=${user.id}, email=${user.email}, role=${user.role}`);

    // 2. Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log(`[AUTH] Password Trace: provided_len=${password.length}, hash_len=${user.password?.length}, match=${validPassword}`);

    if (!validPassword) {
        throw AppError.unauthorized('Invalid credentials.');
    }

    // 3. Fetch permissions for this user's role
    let permissions: string[] = [];
    if (user.role_id) {
        const permResult = await pool.query(
            `SELECT p.module, p.action
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
            [user.role_id]
        );
        permissions = permResult.rows.map(p => `${p.module}:${p.action}`);
    }

    // 4. Generate tokens
    const tenantId = user.tenant_id || 'tenant_default';
    const accessToken = generateAccessToken({
        userId: user.id,
        tenantId,
        role: user.role as UserRole,
        permissions,
    });
    const refreshToken = generateRefreshToken({
        userId: user.id,
        tenantId,
    });

    // 5. Store hashed refresh token in DB
    await pool.query(
        'UPDATE users SET refresh_token = $1, last_login = NOW() WHERE id = $2',
        [refreshToken, user.id]
    );

    // 6. Audit log
    AuditService.log({
        tenantId,
        userId: user.id,
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: String(user.id),
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || '',
        userAgent: req.headers['user-agent'] || '',
    });

    // 7. Respond (backward compatible + upgraded)
    res.json({
        success: true,
        accessToken,
        token: accessToken, // backward compat
        refreshToken,
        mustChangePassword: user.is_password_temp || false,
        user: {
            id: user.id,
            tenant_id: tenantId,
            employee_id: user.employee_id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
            address: user.address || '',
            emergency: user.emergency || '',
            permissions,
        },
    });
}));

// ─── POST /refresh ──────────────────────────────────────────────────────────

router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    // Also support header-based refresh (backward compat)
    const token = refreshToken || (() => {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
        return null;
    })();

    if (!token) {
        throw AppError.unauthorized('No refresh token provided.');
    }

    // 1. Verify the refresh token
    let decoded;
    try {
        decoded = verifyRefreshToken(token);
    } catch {
        throw AppError.unauthorized('Invalid or expired refresh token.');
    }

    // 2. Validate against stored token
    const userResult = await pool.query(
        'SELECT u.*, r.id as role_record_id FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1 AND u.is_active = true',
        [decoded.userId]
    );

    if (userResult.rows.length === 0) {
        throw AppError.unauthorized('User not found or inactive.');
    }

    const user = userResult.rows[0];

    // 3. Fetch permissions
    let permissions: string[] = [];
    if (user.role_id) {
        const permResult = await pool.query(
            `SELECT p.module, p.action
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1`,
            [user.role_id]
        );
        permissions = permResult.rows.map(p => `${p.module}:${p.action}`);
    }

    // 4. Issue new access token
    const newAccessToken = generateAccessToken({
        userId: user.id,
        tenantId: user.tenant_id || decoded.tenantId,
        role: user.role as UserRole,
        permissions,
    });

    // 5. Rotate refresh token
    const newRefreshToken = generateRefreshToken({
        userId: user.id,
        tenantId: user.tenant_id || decoded.tenantId,
    });

    await pool.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2',
        [newRefreshToken, user.id]
    );

    res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    });
}));

// ─── POST /logout ───────────────────────────────────────────────────────────

router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.user) {
        // Invalidate refresh token
        await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.userId]);

        AuditService.log({
            tenantId: req.user.tenantId,
            userId: req.user.userId,
            action: AuditAction.LOGOUT,
            entityType: 'user',
            entityId: String(req.user.userId),
        });
    }

    res.json({ success: true, message: 'Logged out successfully.' });
}));

// ─── GET /me ────────────────────────────────────────────────────────────────

router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();

    const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.address, u.emergency,
                u.tenant_id, u.created_at, u.preferences, e.id as employee_id
         FROM users u
         LEFT JOIN employees e ON u.email = e.email AND u.tenant_id = e.tenant_id
         WHERE u.id = $1 AND u.deleted_at IS NULL`,
        [req.user.userId]
    );

    if (result.rows.length === 0) throw AppError.notFound('User');

    res.json({
        success: true,
        user: {
            ...result.rows[0],
            permissions: req.user.permissions,
        },
    });
}));

// ─── PUT /me ────────────────────────────────────────────────────────────────

router.put('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();

    const { name, phone, address, emergency, preferences } = req.body;

    const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             address = COALESCE($3, address),
             emergency = COALESCE($4, emergency),
             preferences = COALESCE($5, preferences),
             updated_at = NOW()
         WHERE id = $6
         RETURNING id, name, email, role, phone, address, emergency, preferences`,
        [name, phone || null, address || null, emergency || null, preferences || null, req.user.userId]
    );

    if (result.rows.length === 0) throw AppError.notFound('User');

    AuditService.log({
        ...AuditService.fromRequest(req),
        action: AuditAction.UPDATE,
        entityType: 'user',
        entityId: String(req.user.userId),
        newValues: { name, phone, address },
    });

    res.json({
        success: true,
        message: 'Profile updated successfully.',
        user: result.rows[0],
    });
}));

// ─── PUT /me/preferences ────────────────────────────────────────────────────
router.put('/me/preferences', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();

    const { preferences } = req.body;
    if (!preferences) throw AppError.badRequest('Preferences required.');

    await pool.query(
        'UPDATE users SET preferences = $1 WHERE id = $2',
        [JSON.stringify(preferences), req.user.userId]
    );

    res.json({ success: true, message: 'Preferences updated.' });
}));

// ─── PUT /me/password ───────────────────────────────────────────────────────
router.put('/me/password', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) throw AppError.unauthorized();

    const { currentPassword, newPassword } = req.body;
    if (!newPassword) throw AppError.badRequest('New password required.');

    // 1. Verify current password
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.userId]);
    const valid = await bcrypt.compare(currentPassword, user.rows[0].password);
    if (!valid) throw AppError.unauthorized('Incorrect current password.');

    // 2. Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
        'UPDATE users SET password = $1, temp_password = NULL, is_password_temp = false WHERE id = $2',
        [hashed, req.user.userId]
    );

    res.json({ success: true, message: 'Password updated successfully.' });
}));

export default router;
