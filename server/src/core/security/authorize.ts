import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../../types';
import { JwtService } from './jwt.service';

/**
 * Primary authentication middleware.
 * Reads the Bearer token exclusively from the Authorization header.
 * Does NOT accept ?token= query parameters (ARC-08: query-token restricted to SSE only).
 */
export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.',
            });
            return;
        }

        const decoded = JwtService.verifyAccessToken(token);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            tenantId: decoded.tenantId,
            role: decoded.role,
            dashboard_type: decoded.dashboard_type,
            permissions: decoded.permissions || [],
            is_password_temp: decoded.is_password_temp,
        };

        // Server enforcement: users with temporary passwords must change them before accessing the app
        if (req.user.is_password_temp) {
            const rawPath = (req.originalUrl || req.baseUrl || req.url || '').split('?')[0];
            const isPasswordChange = (rawPath.endsWith('/auth/me/password') || rawPath.endsWith('/me/password')) && req.method === 'PUT';
            const isMeCheck = (rawPath.endsWith('/auth/me') || rawPath.endsWith('/me')) && req.method === 'GET';
            const isLogout = rawPath.endsWith('/auth/logout') || rawPath.endsWith('/logout');

            if (!isPasswordChange && !isMeCheck && !isLogout) {
                res.status(403).json({
                    success: false,
                    code: 'FORCE_PASSWORD_CHANGE',
                    message: 'Temporary password must be changed before accessing the application.',
                });
                return;
            }
        }

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

/**
 * SSE-only authentication middleware (ARC-08).
 * Accepts the Bearer token from either the Authorization header OR the ?token= query parameter.
 * MUST NOT be applied to any HTTP endpoint other than the SSE stream.
 * Query parameters appear in server logs and browser history — this trade-off is acceptable
 * only for EventSource connections which cannot send custom headers in most browsers.
 */
export const authenticateRealtime = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        } else if (req.query.token && typeof req.query.token === 'string') {
            token = req.query.token;
        }

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Authentication required. No token provided.',
            });
            return;
        }

        const decoded = JwtService.verifyAccessToken(token);

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            tenantId: decoded.tenantId,
            role: decoded.role,
            dashboard_type: decoded.dashboard_type,
            permissions: decoded.permissions || [],
            is_password_temp: decoded.is_password_temp,
        };

        if (req.user.is_password_temp) {
            res.status(403).json({
                success: false,
                code: 'FORCE_PASSWORD_CHANGE',
                message: 'Temporary password must be changed before accessing realtime stream.',
            });
            return;
        }

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

/** Alias for backward compatibility */
export const authenticateWithQueryToken = authenticateRealtime;

// ─── PERMISSION CATALOGUE ───────────────────────────────────────────────────
// Maps legacy role-name guards (used in route files) to their canonical
// module:action permission strings.  Any role whose DB permissions include
// ANY of these strings will pass the gate — regardless of the role name.
//
// Rule: super_admin bypasses everything.
//       dashboard_type='admin' bypasses everything (owner-level user).
//       All other access is driven purely by the permissions[] array in the JWT.

// Maps legacy route role-name guards → actual module:action permission strings
// that exist in the DB (from schema.ts PERMISSIONS_LIST).
// ANY user whose JWT permissions[] contains at least ONE of these passes.
const ROLE_TO_PERMISSIONS: Record<string, string[]> = {
    super_admin: [], // always allowed — short-circuited above
    admin: ['settings:manage', 'employees:view', 'employees:create', 'employees:update', 'payroll:manage', 'reports:view'],
    hr: ['employees:view', 'employees:create', 'employees:update', 'leave:approve', 'onboarding:manage', 'attendance:manage'],
    manager: ['employees:view', 'leave:approve', 'reports:view', 'attendance:view'],
    employee: ['attendance:view', 'attendance:check_in', 'leave:view', 'leave:apply', 'profile:view', 'profile:update', 'dashboard:view'],
};

/**
 * The access decision used by authorize(), as a pure function so the same rules can be
 * applied where the required permission is only known after loading a record (HF-4).
 * Behaviour is identical to the previous inline logic.
 */
type AccessSubject = { role?: string; dashboard_type?: string; permissions?: string[] };

/**
 * The two identities that pass every check. They are named here, once, so the authorization-state
 * policy (core/security/authzState.ts) and hasAccess() cannot drift apart.
 * TEMPORARY COMPATIBILITY DEPENDENCY: HF-9A removes both bypasses once the production
 * role-permission export (OW-4) is available. Nothing new may depend on role names or on
 * dashboard_type beyond these two helpers.
 */
export const isSuperAdminIdentity = (user: AccessSubject): boolean => (user.role || '').toLowerCase() === 'super_admin';
export const hasDashboardAdminBypass = (user: AccessSubject): boolean => (user.dashboard_type || '').toLowerCase() === 'admin';

export const hasAccess = (
    user: AccessSubject,
    permissionOrRole: string | string[]
): boolean => {
    const userRole = (user.role || '').toLowerCase();
    const userPerms = user.permissions || [];

    // 1. super_admin — unconditional pass
    if (isSuperAdminIdentity(user)) return true;

    // 2. dashboard_type=admin — owner-level pass (used when tenant owner
    //    has a custom role name but full access)
    if (hasDashboardAdminBypass(user)) return true;

    const required = Array.isArray(permissionOrRole) ? permissionOrRole : [permissionOrRole];

    return required.some(entry => {
        const entryLower = entry.toLowerCase();

        // 3. Explicit module:action permission string in JWT
        if (entry.includes(':')) {
            return userPerms.includes(entry);
        }

        // 4. Legacy role-name guard — resolve to permission strings and check
        //    This allows ANY role (including custom ones like "trainees") to
        //    pass as long as their DB permissions cover what the route needs.
        const neededPerms = ROLE_TO_PERMISSIONS[entryLower] || [];
        if (neededPerms.length > 0) {
            return neededPerms.some(p => userPerms.includes(p));
        }

        // 5. Fallback: exact role-name match (keeps backward compat for
        //    routes that only super_admin should ever reach via role name)
        return userRole === entryLower;
    });
};

export const authorize = (permissionOrRole: string | string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required.' });
            return;
        }

        const userRole = (req.user.role || '').toLowerCase();
        const dashType = (req.user.dashboard_type || '').toLowerCase();
        const userPerms = req.user.permissions || [];
        const required = Array.isArray(permissionOrRole) ? permissionOrRole : [permissionOrRole];

        const isAllowed = hasAccess(req.user, permissionOrRole);

        if (!isAllowed) {
            console.warn(
                `[AUTH] 403: User ${req.user.email} ` +
                `(role=${userRole}, dash=${dashType}) -> ${req.originalUrl} ` +
                `required=[${required.join(', ')}] ` +
                `userPerms=[${userPerms.join(', ')}]`
            );
            res.status(403).json({ success: false, message: 'Access denied: insufficient permissions' });
            return;
        }

        next();
    };
};

export const enforceTenantIsolation = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

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

/**
 * Roles that are allowed to view data for other users via ?userId= or :userId params.
 * Employees may only access their own data.
 */
const ELEVATED_ROLES = new Set<string>([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.MANAGER,
]);

/**
 * requireSelfOrAdmin — guards GET endpoints that accept a ?userId= query param.
 *
 * Rules:
 *   - If no ?userId is provided, the request is self-scoped (always allowed).
 *   - If ?userId IS provided and matches the authenticated user's own ID, allowed.
 *   - If ?userId IS provided and differs from the authenticated user's ID:
 *       → Admin / HR / Manager / Super-Admin: allowed.
 *       → Employee (or any non-elevated role): 403.
 *
 * Usage: apply as inline middleware before the asyncHandler on any GET route
 * that accepts ?userId for cross-user viewing.
 */
export const requireSelfOrAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    // Accept userId from either ?userId= query param or :userId route param.
    // Route params take precedence when both are present (e.g. /summary/:userId).
    const requestedUserId = (req.params.userId as string | undefined) || req.query.userId;

    // No cross-user request — self-scoped, always fine
    if (!requestedUserId) {
        return next();
    }

    if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required.' });
        return;
    }

    // Same user — fine
    if (String(requestedUserId) === String(req.user.userId)) {
        return next();
    }

    // Different userId — must be an elevated role
    if (ELEVATED_ROLES.has(req.user.role)) {
        return next();
    }

    res.status(403).json({
        success: false,
        message: 'Access denied: you can only view your own data.',
    });
};
