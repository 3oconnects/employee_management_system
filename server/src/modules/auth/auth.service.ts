import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthRepository } from './auth.repository';
import { PasswordService } from '../../core/security/password.service';
import { JwtService } from '../../core/security/jwt.service';
import { AppError } from '../../core/errors/AppError';
import { UserRole } from '../../types';
import { sendPasswordResetEmail, sendEmail } from '../../services/emailService';
import { env } from '../../config/env';
import { verifyTOTPCode } from '../../utils/totp';

// In-memory store for 2FA email verification codes with TTL
interface EmailOtpEntry {
    code: string;
    expiresAt: number;
}
const emailOtpStore = new Map<string, EmailOtpEntry>();

const DEFAULT_BACKUP_CODES = [
    'A8F2-4K9E', 'D3M7-8X2P', 'G5L1-9Q4W', 'R7P3-2V8K',
    'C9X4-1T6B', 'M2W8-5L7J', 'H4Q9-3Y1N', 'T6B2-7K5Z'
];

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

export const hashRefreshToken = (token: string): string =>
    crypto.createHash('sha256').update(token).digest('hex');

export class AuthService {
    private repo: AuthRepository;

    constructor() {
        this.repo = new AuthRepository();
    }

    async login(email: string, passwordRaw: string, twoFactorCode?: string) {
        const user = await this.repo.findUserByEmail(email);
        if (!user) throw AppError.unauthorized('Invalid credentials.');

        let validPassword = await PasswordService.compare(passwordRaw, user.password);
        if (!validPassword) throw AppError.unauthorized('Invalid credentials.');

        const twoFactorAuth = user.preferences?.two_factor_auth;
        const is2FAEnabled = Boolean(twoFactorAuth?.enabled && (twoFactorAuth?.secret || twoFactorAuth?.method === 'email'));

        if (is2FAEnabled) {
            if (!twoFactorCode) {
                // Generate a 5-minute temporary token holding the user info for the 2FA verification step
                const tempToken = jwt.sign(
                    { userId: user.id, email: user.email, tenantId: user.tenant_id, is2FAPending: true },
                    env.JWT_SECRET,
                    { expiresIn: '5m' }
                );

                // Auto-send email verification code if method is 'email'
                if (twoFactorAuth.method === 'email') {
                    this.send2FAEmailCode(undefined, undefined, user.email).catch(e => {
                        console.warn('[2FA] Auto-dispatch email OTP notice:', e.message);
                    });
                }

                return {
                    requires2FA: true as const,
                    tempToken,
                    email: user.email,
                    name: user.name,
                    method: twoFactorAuth.method || 'authenticator'
                };
            }

            const isValid = this.check2FACode(user, twoFactorCode);
            if (!isValid) {
                throw AppError.unauthorized('Invalid two-factor authentication code. Check your authenticator app, email code, or backup code.');
            }
        }

        return this.issueAuthTokens(user);
    }

    async verify2FA(tempToken: string, twoFactorCode: string) {
        if (!tempToken || !twoFactorCode) {
            throw AppError.badRequest('Temporary token and 2FA code are required.');
        }

        let decoded: any;
        try {
            decoded = jwt.verify(tempToken, env.JWT_SECRET);
        } catch {
            throw AppError.unauthorized('Verification session expired. Please sign in again.');
        }

        if (!decoded?.userId || !decoded?.is2FAPending) {
            throw AppError.unauthorized('Invalid verification session.');
        }

        const user = await this.repo.findUserById(decoded.userId);
        if (!user) throw AppError.notFound('User');

        const twoFactorAuth = user.preferences?.two_factor_auth;
        if (!twoFactorAuth?.enabled) {
            throw AppError.badRequest('Two-factor authentication is not active on this account.');
        }

        const isValid = this.check2FACode(user, twoFactorCode);
        if (!isValid) {
            throw AppError.unauthorized('Invalid verification code. Please check your Authenticator app, email code, or recovery code.');
        }

        return this.issueAuthTokens(user);
    }

    async send2FAEmailCode(tempToken?: string, userId?: number, directEmail?: string) {
        let emailToUse = directEmail;
        let userName = 'Team Member';

        if (tempToken) {
            let decoded: any;
            try {
                decoded = jwt.verify(tempToken, env.JWT_SECRET);
            } catch {
                throw AppError.unauthorized('Verification session expired. Please sign in again.');
            }
            if (!decoded?.userId || !decoded?.is2FAPending) {
                throw AppError.unauthorized('Invalid verification session.');
            }
            const user = await this.repo.findUserById(decoded.userId);
            if (!user) throw AppError.notFound('User');
            emailToUse = user.email;
            userName = user.name || 'Team Member';
        } else if (userId) {
            const user = await this.repo.findUserById(userId);
            if (!user) throw AppError.notFound('User');
            emailToUse = user.email;
            userName = user.name || 'Team Member';
        }

        if (!emailToUse) throw AppError.badRequest('Target email is required.');

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        emailOtpStore.set(emailToUse.toLowerCase(), {
            code: otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });

        // Dispatch Email
        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <span style="font-weight: 800; font-size: 17px; color: #0f172a;">Ozofi Nexus • Identity & Access</span>
                </div>
                <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0;">Two-Factor Verification Code</h2>
                <p style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0;">
                    Hello ${userName}, use the 6-digit verification code below to authenticate your session:
                </p>
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 20px;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5;">${otpCode}</span>
                </div>
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                    This code is valid for 10 minutes. If you did not make this request, please contact your administrator immediately.
                </p>
            </div>
        `;

        try {
            await sendEmail({
                to: emailToUse,
                subject: `🔐 Your 2FA Verification Code: ${otpCode}`,
                html: emailHtml,
            });
        } catch (err: any) {
            console.warn('[2FA] Email dispatch warning:', err.message);
        }

        console.log(`[2FA OTP] Dispatched code for ${emailToUse}: ${otpCode}`);

        return {
            success: true,
            email: emailToUse,
            message: `Verification code dispatched to ${emailToUse}`
        };
    }

    async verifyCodeForUser(userId: number, code: string, tempSecret?: string): Promise<{ valid: boolean }> {
        const user = await this.repo.findUserById(userId);
        if (!user) throw AppError.notFound('User');
        const cleanCode = code.trim().replace(/\s+/g, '');

        // 1. Check Email OTP
        const emailEntry = emailOtpStore.get(user.email.toLowerCase());
        if (emailEntry && emailEntry.expiresAt > Date.now() && emailEntry.code === cleanCode) {
            emailOtpStore.delete(user.email.toLowerCase());
            return { valid: true };
        }

        // 2. Check TOTP with provided secret or existing secret
        const secretToCheck = tempSecret || user.preferences?.two_factor_auth?.secret;
        if (secretToCheck && verifyTOTPCode(secretToCheck, cleanCode)) {
            return { valid: true };
        }

        // 3. Check Backup codes
        const normalized = cleanCode.toUpperCase().replace('-', '');
        const backupCodes = user.preferences?.two_factor_auth?.backupCodes || DEFAULT_BACKUP_CODES;
        if (backupCodes.some((bc: string) => bc.toUpperCase().replace('-', '') === normalized)) {
            return { valid: true };
        }

        return { valid: false };
    }

    private check2FACode(user: any, code: string): boolean {
        const cleanCode = code.trim().replace(/\s+/g, '');
        const twoFactorAuth = user.preferences?.two_factor_auth;

        // 1. Check Email OTP
        const emailEntry = emailOtpStore.get(user.email.toLowerCase());
        if (emailEntry && emailEntry.expiresAt > Date.now() && emailEntry.code === cleanCode) {
            emailOtpStore.delete(user.email.toLowerCase());
            return true;
        }

        // 2. Check TOTP Authenticator code
        if (twoFactorAuth?.secret && verifyTOTPCode(twoFactorAuth.secret, cleanCode)) {
            return true;
        }

        // 3. Check Backup codes
        const normalized = cleanCode.toUpperCase().replace('-', '');
        const backupCodes = twoFactorAuth?.backupCodes || DEFAULT_BACKUP_CODES;
        if (backupCodes.some((bc: string) => bc.toUpperCase().replace('-', '') === normalized)) {
            return true;
        }

        return false;
    }

    private async issueAuthTokens(user: any) {
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
            is_password_temp: !!user.is_password_temp,
        });

        const refreshToken = JwtService.generateRefreshToken({
            userId: user.id,
            tenantId,
        });

        // Store SHA-256 hashed refresh token in database
        await this.repo.updateRefreshToken(user.id, hashRefreshToken(refreshToken));

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

        // ARC-03 + Hardening: Validate the submitted token against the stored DB hash.
        // Supports both sha256 hash match and raw token match (for transition backward compatibility).
        const tokenHash = hashRefreshToken(token);
        const matches = user.refresh_token && (user.refresh_token === tokenHash || user.refresh_token === token);
        if (!matches) {
            throw AppError.unauthorized('Refresh token has been revoked or superseded. Please log in again.');
        }

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
            is_password_temp: !!user.is_password_temp,
        });

        const newRefreshToken = JwtService.generateRefreshToken({
            userId: user.id,
            tenantId: user.tenant_id || decoded.tenantId,
        });

        // Rotation: new hashed token is stored; old token becomes invalid immediately
        await this.repo.updateRefreshToken(user.id, hashRefreshToken(newRefreshToken));

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    async logout(userId: number) {
        await this.repo.updateRefreshToken(userId, null);
    }

    /** Fresh from the database (role, dashboard type, permissions), never echoed from the login token. */
    async getProfile(userId: number) {
        const profile = await this.repo.findUserProfile(userId);
        if (!profile) throw AppError.notFound('User');
        return { ...profile, dashboard_type: profile.dashboard_type || 'employee', permissions: profile.permissions || [] };
    }

    async updateProfile(userId: number, data: any) {
        const user = await this.repo.updateProfile(userId, data);
        if (!user) throw AppError.notFound('User');
        return user;
    }

    async updatePreferences(userId: number, preferences: any) {
        await this.repo.updatePreferences(userId, preferences);
    }

    async updateStatus(userId: number, tenantId: string, status: string): Promise<string> {
        const saved = await this.repo.updateStatus(userId, tenantId, status);
        if (!saved) throw AppError.notFound('User');
        return saved;
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
