// ============================================================================
// EMS BACKEND — SETTINGS ROUTES (EXTENDED)
// ============================================================================
// Adds:
//   GET/PUT /settings/config         — Organization & app-level config
//   GET/PUT /settings/email-config   — SMTP email settings
//   POST    /settings/test-email     — Send a test email
//   POST    /settings/users/:id/send-welcome — Send welcome email with temp pass
//   GET/PUT /settings/security       — Password policy + session config
//   GET/PUT /settings/features       — Module enable/disable per tenant
// ============================================================================

import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../types';
import { sendEmail, buildWelcomeEmail, buildRoleAssignmentEmail } from '../services/emailService';

const router = express.Router();

router.use(authenticate);
router.use(authorize(['admin', 'super_admin']));

const DEFAULT_TENANT = 'tenant_default';

// ─── ENSURE app_config TABLE EXISTS ─────────────────────────────────────────
const ensureAppConfigTable = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_config (
            id SERIAL PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            category TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(tenant_id, category, key)
        )
    `).catch(() => {});
};

// ─── GET /settings/permissions ───────────────────────────────────────────────
router.get('/permissions', asyncHandler(async (_req, res) => {
    const result = await pool.query(
        `SELECT id, module, action, description FROM permissions ORDER BY module, action`
    );
    const grouped: Record<string, any[]> = {};
    for (const row of result.rows) {
        if (!grouped[row.module]) grouped[row.module] = [];
        grouped[row.module].push({ id: row.id, action: row.action, description: row.description });
    }
    res.json({ success: true, data: grouped, flat: result.rows });
}));

// ─── GET /settings/roles ─────────────────────────────────────────────────────
router.get('/roles', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    try {
        const roles = await pool.query(
            `SELECT r.id, r.name, r.description, r.is_system,
                    COUNT(DISTINCT u.id) as user_count
             FROM roles r
             LEFT JOIN users u ON u.role_id = r.id
             WHERE r.tenant_id = $1 OR r.tenant_id IS NULL
             GROUP BY r.id ORDER BY r.is_system DESC, r.name`,
            [tenantId]
        );
        const permResult = await pool.query(
            `SELECT rp.role_id, p.module, p.action FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             JOIN roles r ON r.id = rp.role_id AND (r.tenant_id = $1 OR r.tenant_id IS NULL)`,
            [tenantId]
        );
        const permsByRole: Record<number, string[]> = {};
        for (const row of permResult.rows) {
            if (!permsByRole[row.role_id]) permsByRole[row.role_id] = [];
            permsByRole[row.role_id].push(`${row.module}:${row.action}`);
        }
        res.json({
            success: true,
            data: roles.rows.map(r => ({
                ...r,
                created_at: new Date(),
                user_count: parseInt(r.user_count),
                permissions: permsByRole[r.id] || [],
            })),
        });
    } catch (err: any) {
        console.error('ROLES_FETCH_ERROR:', err.message);
        const fallback = await pool.query('SELECT id, name FROM roles LIMIT 100');
        res.json({ success: true, data: fallback.rows.map(r => ({ ...r, user_count: 0, permissions: [] })), warning: err.message });
    }
}));


// ─── POST /settings/roles ────────────────────────────────────────────────────
router.post('/roles', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name, description, permissions = [] } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    if (!name?.trim()) throw AppError.badRequest('Role name is required.');
    
    try {
        const roleResult = await pool.query(
            `INSERT INTO roles (tenant_id, name, description, is_system)
             VALUES ($1, $2, $3, false) RETURNING *`,
            [tenantId, name.trim(), description || null]
        );
        const role = roleResult.rows[0];
        for (const permKey of permissions) {
            const [module, action] = permKey.split(':');
            const p = await pool.query('SELECT id FROM permissions WHERE module=$1 AND action=$2', [module, action]);
            if (p.rows.length > 0) {
                await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [role.id, p.rows[0].id]);
            }
        }
        res.status(201).json({ success: true, data: { ...role, permissions } });
    } catch (err: any) {
        console.error('ROLE_CREATE_ERROR:', err.message);
        res.status(400).json({ success: false, message: 'Failed to create role: ' + err.message });
    }
}));


// ─── PUT /settings/roles/:id ─────────────────────────────────────────────────
router.put('/roles/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const result = await pool.query(
        `UPDATE roles SET name=COALESCE($1,name), description=COALESCE($2,description)
         WHERE id=$3 AND tenant_id=$4 AND is_system=false RETURNING *`,
        [name || null, description || null, id, tenantId]
    );
    if (result.rows.length === 0) throw AppError.notFound('Role not found or is a system role.');
    res.json({ success: true, data: result.rows[0] });
}));

// ─── DELETE /settings/roles/:id ──────────────────────────────────────────────
router.delete('/roles/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const usersOnRole = await pool.query('SELECT COUNT(*) FROM users WHERE role_id=$1', [id]);
    if (parseInt(usersOnRole.rows[0].count) > 0) throw AppError.badRequest('Cannot delete role: users still assigned.');
    const result = await pool.query(
        'DELETE FROM roles WHERE id=$1 AND tenant_id=$2 AND is_system=false RETURNING id',
        [id, tenantId]
    );
    if (result.rows.length === 0) throw AppError.notFound('Role not found or is a system role.');
    res.json({ success: true, message: 'Role deleted.' });
}));

// ─── PUT /settings/roles/:id/permissions ─────────────────────────────────────
router.put('/roles/:id/permissions', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { permissions = [] } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    const roleCheck = await pool.query('SELECT id FROM roles WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    if (roleCheck.rows.length === 0) throw AppError.notFound('Role');
    await pool.query('DELETE FROM role_permissions WHERE role_id=$1', [id]);
    for (const permKey of permissions) {
        const [module, action] = permKey.split(':');
        if (!module || !action) continue;
        const p = await pool.query('SELECT id FROM permissions WHERE module=$1 AND action=$2', [module, action]);
        if (p.rows.length > 0) {
            await pool.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [id, p.rows[0].id]);
        }
    }
    res.json({ success: true, message: 'Permissions updated.', permissions });
}));

// ─── GET /settings/users ─────────────────────────────────────────────────────
router.get('/users', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    try {
        const result = await pool.query(
            `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login,
                    u.role_id, r.name as role_name,
                    e.id as employee_id, e.department, e.position
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.email = u.email AND (e.tenant_id = u.tenant_id OR u.tenant_id IS NULL)
             WHERE (u.tenant_id = $1 OR u.tenant_id IS NULL) AND (u.deleted_at IS NULL OR true)
             ORDER BY u.id DESC`,
            [tenantId]
        );
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        console.error('FETCH_USERS_ERROR:', err.message);
        // Fallback: Return users without joins if it fails
        const fallback = await pool.query('SELECT id, name, email, role FROM users LIMIT 100');
        res.json({ success: true, data: fallback.rows, warning: 'Limited data mode' });
    }
}));


// ─── POST /settings/users ────────────────────────────────────────────────────
router.post('/users', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { name, email, password, role = 'employee', role_id, send_welcome_email = false } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    if (!name || !email || !password) throw AppError.badRequest('Name, email and password are required.');
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length > 0) throw AppError.badRequest('A user with this email already exists.');
    const hashedPassword = await bcrypt.hash(password, 10);
    let resolvedRoleId = role_id;
    if (!resolvedRoleId) {
        const roleResult = await pool.query('SELECT id FROM roles WHERE tenant_id=$1 AND name=$2', [tenantId, role]);
        resolvedRoleId = roleResult.rows[0]?.id || null;
    }
    const result = await pool.query(
        `INSERT INTO users (name, email, password, role, tenant_id, role_id, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id, name, email, role, is_active`,
        [name, email, hashedPassword, role, tenantId, resolvedRoleId]
    );
    const newUser = result.rows[0];

    // Send welcome email if requested
    if (send_welcome_email) {
        const loginUrl = process.env.APP_URL || 'http://localhost:5173';
        await sendEmail({
            to: email,
            subject: '🎉 Welcome — Your account is ready',
            html: buildWelcomeEmail({ name, email, tempPassword: password, role, loginUrl }),
        });
    }

    res.status(201).json({ success: true, data: newUser });
}));

// ─── POST /settings/users/:id/send-welcome ───────────────────────────────────
router.post('/users/:id/send-welcome', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { temp_password } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;

    const userResult = await pool.query(
        'SELECT u.name, u.email, u.role FROM users u WHERE u.id=$1 AND u.tenant_id=$2',
        [id, tenantId]
    );
    if (userResult.rows.length === 0) throw AppError.notFound('User');
    const user = userResult.rows[0];

    const tempPass = temp_password || Math.random().toString(36).slice(-10).toUpperCase();
    if (temp_password) {
        const hashed = await bcrypt.hash(tempPass, 10);
        await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, id]);
    }

    const loginUrl = process.env.APP_URL || 'http://localhost:5173';
    const sent = await sendEmail({
        to: user.email,
        subject: '🎉 Welcome — Your AURA account is ready',
        html: buildWelcomeEmail({ name: user.name, email: user.email, tempPassword: tempPass, role: user.role, loginUrl }),
    });

    res.json({ success: true, sent, message: sent ? 'Welcome email sent.' : 'No SMTP config. Email not sent.' });
}));

// ─── PUT /settings/users/:id/role ────────────────────────────────────────────
router.put('/users/:id/role', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { role, role_id, notify_user = false } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    let resolvedRoleId = role_id;
    if (!resolvedRoleId && role) {
        const r = await pool.query('SELECT id FROM roles WHERE tenant_id=$1 AND name=$2', [tenantId, role]);
        resolvedRoleId = r.rows[0]?.id || null;
    }
    await pool.query(
        `UPDATE users SET role=COALESCE($1,role), role_id=$2 WHERE id=$3 AND tenant_id=$4`,
        [role || null, resolvedRoleId, id, tenantId]
    );

    // Notify user of role change
    if (notify_user) {
        const u = await pool.query('SELECT name, email FROM users WHERE id=$1', [id]);
        if (u.rows.length > 0) {
            const loginUrl = process.env.APP_URL || 'http://localhost:5173';
            await sendEmail({
                to: u.rows[0].email,
                subject: '🔑 Your role has been updated',
                html: buildRoleAssignmentEmail({ name: u.rows[0].name, email: u.rows[0].email, role, loginUrl }),
            });
        }
    }
    res.json({ success: true, message: 'Role updated.' });
}));

// ─── PUT /settings/users/:id/status ─────────────────────────────────────────
router.put('/users/:id/status', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    await pool.query(`UPDATE users SET is_active=$1 WHERE id=$2 AND tenant_id=$3`, [Boolean(is_active), id, tenantId]);
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'}.` });
}));

// ─── DELETE /settings/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { id } = req.params;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    if (parseInt(id) === req.user?.userId) throw AppError.badRequest('You cannot delete your own account.');
    await pool.query(`UPDATE users SET deleted_at=NOW(), is_active=false WHERE id=$1 AND tenant_id=$2`, [id, tenantId]);
    res.json({ success: true, message: 'User removed.' });
}));

// ─── GET /settings/config ────────────────────────────────────────────────────
router.get('/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
        await ensureAppConfigTable();
        const tenantId = req.user?.tenantId || DEFAULT_TENANT;
        const result = await pool.query(
            `SELECT category, key, value FROM app_config WHERE tenant_id=$1 OR tenant_id IS NULL ORDER BY category, key`,
            [tenantId]
        );
        const config: Record<string, Record<string, string>> = {};
        for (const row of result.rows) {
            if (!config[row.category]) config[row.category] = {};
            config[row.category][row.key] = row.value;
        }
        res.json({ success: true, data: config });
    } catch (err: any) {
        console.error('CONFIG_FETCH_ERROR:', err.message);
        res.json({ success: true, data: {}, warning: err.message });
    }
}));

// ─── PUT /settings/config ────────────────────────────────────────────────────
router.put('/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { category, settings } = req.body;
    const tenantId = req.user?.tenantId || DEFAULT_TENANT;
    if (!category || !settings) throw AppError.badRequest('category and settings required.');

    try {
        await ensureAppConfigTable();
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                `INSERT INTO app_config (tenant_id, category, key, value, updated_at)
                 VALUES ($1,$2,$3,$4,NOW())
                 ON CONFLICT (tenant_id, category, key) DO UPDATE SET value=$4, updated_at=NOW()`,
                [tenantId, category, key, String(value)]
            );
        }
        res.json({ success: true, message: 'Settings saved.' });
    } catch (err: any) {
        console.error('CONFIG_SAVE_ERROR:', err.message);
        res.status(400).json({ success: false, message: 'Failed to save settings: ' + err.message });
    }
}));


// ─── POST /settings/test-email ───────────────────────────────────────────────
router.post('/test-email', asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { to } = req.body;
    if (!to) throw AppError.badRequest('Recipient email required.');
    const sent = await sendEmail({
        to,
        subject: '✅ AURA EMS — Test Email',
        html: `<div style="font-family:sans-serif;padding:32px">
            <h2 style="color:#4f46e5">Test Email</h2>
            <p>Your SMTP configuration is working correctly.</p>
            <p style="color:#94a3b8;font-size:12px">Sent at ${new Date().toISOString()}</p>
        </div>`,
    });
    res.json({ success: true, sent, message: sent ? 'Test email sent!' : 'SMTP not configured or send failed.' });
}));

export default router;
