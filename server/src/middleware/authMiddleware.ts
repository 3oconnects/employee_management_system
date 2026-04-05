// ============================================================================
// EMS BACKEND — AUTH MIDDLEWARE (JWT + RBAC + TENANT ISOLATION)
// ============================================================================
// This middleware:
//   1. Verifies the JWT access token from Authorization header
//   2. Attaches the decoded user (with tenantId + permissions) to req.user
//   3. Provides an `authorize()` factory for role-based route protection
//   4. Provides a `requirePermission()` factory for granular permission checks
// ============================================================================

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload, UserRole } from '../types';

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'ems_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ems_refresh_secret';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ─── TOKEN GENERATION HELPERS ───────────────────────────────────────────────

export const generateAccessToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const generateRefreshToken = (payload: Pick<JwtPayload, 'userId' | 'tenantId'>): string => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
};

export const verifyAccessToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};

export const verifyRefreshToken = (token: string): Pick<JwtPayload, 'userId' | 'tenantId'> => {
    return jwt.verify(token, JWT_REFRESH_SECRET) as Pick<JwtPayload, 'userId' | 'tenantId'>;
};

// ─── AUTHENTICATE MIDDLEWARE ────────────────────────────────────────────────
// Verifies the Bearer token and attaches `req.user` with tenantId, role, etc.

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.',
            });
            return;
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);

        // Attach decoded JWT payload to req for downstream use
        req.user = {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            role: decoded.role,
            permissions: decoded.permissions || [],
        };

        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: 'Token expired. Please refresh your session.',
                code: 'TOKEN_EXPIRED',
            });
            return;
        }

        res.status(401).json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};

// ─── AUTHORIZE MIDDLEWARE (ROLE-BASED) ──────────────────────────────────────
// Usage:  router.get('/admin-only', authenticate, authorize(['admin', 'super_admin']), handler)

export const authorize = (allowedRoles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'You do not have permission to access this resource.',
            });
            return;
        }

        next();
    };
};

// ─── REQUIRE PERMISSION MIDDLEWARE (GRANULAR) ───────────────────────────────
// Usage:  router.post('/payroll/run', authenticate, requirePermission('payroll:run'), handler)

export const requirePermission = (permission: string) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
            return;
        }

        // Super admins bypass permission checks
        if (req.user.role === UserRole.SUPER_ADMIN) {
            next();
            return;
        }

        if (!req.user.permissions.includes(permission)) {
            res.status(403).json({
                success: false,
                message: `Missing required permission: ${permission}`,
            });
            return;
        }

        next();
    };
};

// ─── TENANT ISOLATION MIDDLEWARE ────────────────────────────────────────────
// Ensures the tenant_id from JWT matches any tenant_id in request params/body.
// This prevents cross-tenant data access.

export const enforceTenantIsolation = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

    // If a tenantId is explicitly passed in body or params, ensure it matches the JWT
    const requestTenantId = req.body?.tenant_id || req.params?.tenantId;
    if (requestTenantId && requestTenantId !== req.user.tenantId) {
        res.status(403).json({
            success: false,
            message: 'Cross-tenant access denied.',
        });
        return;
    }

    next();
};
