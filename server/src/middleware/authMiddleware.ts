/**
 * @deprecated This file is no longer the active authentication middleware.
 * All modules must import from `../../core/security/authorize`.
 *
 * This redirect exists only to prevent accidental resurrection of old import
 * paths. It contains NO business logic and NO hardcoded secrets.
 */
export {
    authenticate,
    authorize,
    enforceTenantIsolation,
    requireSelfOrAdmin,
    authenticateWithQueryToken,
} from '../core/security/authorize';

import { JwtService } from '../core/security/jwt.service';

export const generateAccessToken = JwtService.generateAccessToken;
export const generateRefreshToken = JwtService.generateRefreshToken;
export const verifyAccessToken = JwtService.verifyAccessToken;
export const verifyRefreshToken = JwtService.verifyRefreshToken;
export { JwtService };


