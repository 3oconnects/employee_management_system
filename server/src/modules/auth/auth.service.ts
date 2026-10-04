import crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import { PasswordService } from '../../core/security/password.service';
import { JwtService } from '../../core/security/jwt.service';
import { AppError } from '../../core/errors/AppError';
import { UserRole } from '../../types';
import { sendPasswordResetEmail } from '../../services/emailService';

// HF-3: self-service password reset by emailed, single-use, expiring link.
const RESET_TOKEN_TTL_MINUTES = 30;
const RESET_REQUEST_COOLDOWN_SECONDS = 60;
export const PASSWORD_RESET_REQUEST_MESSAGE =
    'If an account exists for that email, we have sent a password reset link. It is valid for 30 minutes.';
export const PASSWORD_RESET_INVALID_MESSAGE =
    'This password reset link is invalid or has expired. Please request a new one.';

export const hashResetToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

const buildResetUrl = (token: string): string => {
    const base = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
    // The token travels in the URL fragment so it is never sent to a server, proxy log or Referer.
    return `${base}/login#reset_token=${token}`;
};

export class AuthService {
    private repo: AuthRepository;

    constructor() {
        this.repo = new AuthRepository();
    }

    async login(email: string, passwordRaw: string) {
        const user = await this.repo.findUserByEmail(email);
        if (!user) throw AppError.unauthorized('Invalid credentials.');

        let validPassword = await PasswordService.compare(passwordRaw, user.password);
        if (!validPassword && user.temp_password && user.temp_password === passwordRaw) {
            validPassword = true;
        }
        if (!validPassword) throw AppError.unauthorized('Invalid credentials.');

        let permissions: string[] = [];
        if (user.role_id) {
            permissions = await this.repo.findRolePermissions(user.role_id);
        }

        const tenantId = user.tenant_id;
        if (!tenantId) throw AppError.unauthorized('User does not belong to any tenant.');

        const accessToken = JwtService.generateAccessToken({
            userId: user.id,
            email: user.email,
            tenantId,
            role: user.role as UserRole,
            dashboard_type: user.dashboard_type,
            permissions,
        });

        const refreshToken = JwtService.generateRefreshToken({
            userId: user.id,
            tenantId,
        });

        await this.repo.updateRefreshToken(user.id, refreshToken);

        return {
            accessToken,
            refreshToken,
            user,
            permissions
        };
    }

    async refresh(token: string) {
        let decoded;
        try {
            decoded = JwtService.verifyRefreshToken(token);
        } catch (err) {
            throw AppError.unauthorized('Invalid or expired refresh token.');
        }

        const user = await this.repo.findUserById(decoded.userId);
        if (!user) throw AppError.unauthorized('User not found or inactive.');

        let permissions: string[] = [];
        if (user.role_id) {
            permissions = await this.repo.findRolePermissions(user.role_id);
        }

        const newAccessToken = JwtService.generateAccessToken({
            userId: user.id,
            email: user.email,
            tenantId: user.tenant_id || decoded.tenantId,
            role: user.role as UserRole,
            dashboard_type: user.dashboard_type,
            permissions,
        });

        const newRefreshToken = JwtService.generateRefreshToken({
            userId: user.id,
            tenantId: user.tenant_id || decoded.tenantId,
        });

        await this.repo.updateRefreshToken(user.id, newRefreshToken);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    async logout(userId: number) {
        await this.repo.updateRefreshToken(userId, null);
    }

    async getProfile(userId: number, permissions: string[]) {
        const profile = await this.repo.findUserProfile(userId);
        if (!profile) throw AppError.notFound('User');
        return { ...profile, dashboard_type: profile.dashboard_type || 'employee', permissions };
    }

    async updateProfile(userId: number, data: any) {
        const user = await this.repo.updateProfile(userId, data);
        if (!user) throw AppError.notFound('User');
        return user;
    }

    async updatePreferences(userId: number, preferences: any) {
        await this.repo.updatePreferences(userId, preferences);
    }

    async updateStatus(userId: number, status: string) {
        await this.repo.updateStatus(userId, status);
    }

    async changePassword(userId: number, currentPassword?: string, newPassword?: string) {
        if (!newPassword || newPassword.length < 6) {
            throw AppError.badRequest('New password must be at least 6 characters.');
        }

        const user = await this.repo.findUserById(userId);
        if (!user) throw AppError.notFound('User');

        if (currentPassword) {
            const valid = await PasswordService.compare(currentPassword, user.password);
            if (!valid) throw AppError.unauthorized('Incorrect current password.');
        } else if (!user.is_password_temp) {
            throw AppError.badRequest('Current password is required to change password.');
        }

        const hashedNew = await PasswordService.hash(newPassword);
        await this.repo.updatePassword(userId, hashedNew);
    }

    /**
     * Always resolves with the same generic message, whether or not the account exists, so the
     * response cannot be used to discover accounts. Nothing credential-like is ever returned.
     */
    async requestPasswordReset(emailRaw: string) {
        const email = emailRaw.trim().toLowerCase();
        try {
            const user = await this.repo.findUserForPasswordReset(email);
            if (user && !(await this.repo.hasRecentPasswordReset(user.id, RESET_REQUEST_COOLDOWN_SECONDS))) {
                const token = crypto.randomBytes(32).toString('base64url');
                await this.repo.createPasswordResetToken({
                    id: `PR-${crypto.randomUUID()}`,
                    employeeId: user.employee_id,
                    tenantId: user.tenant_id,
                    userId: user.id,
                    email: user.email,
                    tokenHash: hashResetToken(token),
                    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
                });
                // Not awaited: the response must not reveal, through its latency, that an email was sent.
                void sendPasswordResetEmail({
                    to: user.email,
                    name: user.name,
                    resetUrl: buildResetUrl(token),
                    expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
                    tenantId: user.tenant_id,
                }).catch(() => console.error('[Auth] Password reset email could not be sent.'));
            }
        } catch (err: any) {
            // Swallowed on purpose (a different response here would reveal account state). Never log the token.
            console.error('[Auth] Password reset request failed:', err?.code || err?.name || 'error');
        }
        return { message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    /** The emailed token is mandatory and is the only thing that authorises the reset. */
    async resetPasswordWithToken(token: string | undefined, newPasswordRaw: string, emailRaw?: string) {
        if (!token || typeof token !== 'string') {
            throw AppError.badRequest('Reset token is required.');
        }
        if (!newPasswordRaw || newPasswordRaw.length < 6) {
            throw AppError.badRequest('New password must be at least 6 characters.');
        }

        const tokenHash = hashResetToken(token);
        const record = await this.repo.findPasswordResetByTokenHash(tokenHash);
        const invalid = () => AppError.badRequest(PASSWORD_RESET_INVALID_MESSAGE);

        if (!record || record.status !== 'issued') throw invalid();
        const expiresAt = Date.parse(record.metadata?.expires_at);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw invalid();
        // If the caller names an account, it must be the one the token was issued for.
        if (emailRaw && emailRaw.trim().toLowerCase() !== String(record.metadata?.email || '').toLowerCase()) throw invalid();
        const userId = Number(record.metadata?.user_id);
        if (!Number.isInteger(userId) || !record.tenant_id) throw invalid();

        const hashedPassword = await PasswordService.hash(newPasswordRaw);
        // The database re-checks status, expiry, tenant and active user atomically (single use).
        const done = await this.repo.consumePasswordReset({
            recordId: record.id,
            tokenHash,
            userId,
            tenantId: record.tenant_id,
            hashedPassword,
        });
        if (!done) throw invalid();

        return {
            success: true,
            message: 'Your password has been reset. You can now sign in with your new password.',
        };
    }
}
