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

// ─── POST /login ────────────────────────────────────────────────────────────

router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;

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
         WHERE u.email = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
        [email]
    );

    if (result.rows.length === 0) {
        throw AppError.unauthorized('Invalid credentials.');
    }

    const user = result.rows[0];

    // 2. Verify password
    const validPassword = await bcrypt.compare(password, user.password);
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
                u.tenant_id, u.created_at, e.id as employee_id
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

    const { name, phone, address, emergency } = req.body;

    const result = await pool.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             address = COALESCE($3, address),
             emergency = COALESCE($4, emergency),
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, name, email, role, phone, address, emergency`,
        [name, phone || null, address || null, emergency || null, req.user.userId]
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

export default router;
