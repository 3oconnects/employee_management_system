import crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import { PasswordService } from '../../core/security/password.service';
import { JwtService } from '../../core/security/jwt.service';
import { AppError } from '../../core/errors/AppError';
import { UserRole } from '../../types';

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

    async requestPasswordReset(emailRaw: string, reason?: string) {
        const email = emailRaw.trim().toLowerCase();
        const user = await this.repo.findUserWithEmployee(email);
        if (!user) {
            throw AppError.notFound('No registered user account found with this email address.');
        }

        // Check for existing request
        const existing = await this.repo.getLatestPasswordResetApproval(email);
        if (existing) {
            if (existing.status === 'pending') {
                return {
                    status: 'pending',
                    requestId: existing.id,
                    message: 'A password reset request is already submitted and awaiting Administrator approval.'
                };
            }
            if (existing.status === 'approved') {
                return {
                    status: 'approved',
                    requestId: existing.id,
                    resetToken: existing.metadata?.reset_token,
                    message: 'Your request has been approved by the Administrator! You can now proceed to set your new password.'
                };
            }
        }

        const id = `PR-${Date.now()}`;
        const resetToken = crypto.randomBytes(20).toString('hex');
        const metadata = {
            email: user.email,
            name: user.name,
            department: user.department || 'General',
            reason: reason?.trim() || 'Forgot password request from sign-in page',
            reset_token: resetToken,
            requested_at: new Date().toISOString()
        };

        const employeeId = user.employee_id || `EMP-${user.id}`;
        await this.repo.createPasswordResetApproval({
            id,
            employeeId,
            metadata,
            tenantId: user.tenant_id || 'tenant_default'
        });

        return {
            status: 'pending',
            requestId: id,
            message: 'Your password reset request has been submitted to the Administrator for approval.'
        };
    }

    async checkPasswordResetStatus(emailRaw: string) {
        const email = emailRaw.trim().toLowerCase();
        const req = await this.repo.getLatestPasswordResetApproval(email);
        if (!req) {
            return {
                status: 'none',
                message: 'No password reset request found for this email address.'
            };
        }

        return {
            status: req.status,
            requestId: req.id,
            resetToken: req.status === 'approved' ? req.metadata?.reset_token : undefined,
            message: req.status === 'approved'
                ? 'Your password reset request has been approved by the Administrator! Please enter your new password.'
                : req.status === 'rejected'
                ? 'Your password reset request was rejected by the Administrator. Please contact HR or submit a new request.'
                : req.status === 'completed'
                ? 'This password reset request has already been completed.'
                : 'Your password reset request is currently awaiting Administrator approval.'
        };
    }

    async resetPasswordWithApproval(emailRaw: string, newPasswordRaw: string, resetToken?: string) {
        const email = emailRaw.trim().toLowerCase();
        if (!newPasswordRaw || newPasswordRaw.length < 6) {
            throw AppError.badRequest('New password must be at least 6 characters.');
        }

        const req = await this.repo.getLatestPasswordResetApproval(email);
        if (!req) {
            throw AppError.badRequest('No password reset request found for this email address.');
        }

        if (req.status === 'pending') {
            throw AppError.forbidden('Administrator has not approved your password reset request yet. Please wait for approval.');
        }

        if (req.status === 'rejected') {
            throw AppError.forbidden('Your password reset request was rejected by the Administrator.');
        }

        if (req.status === 'completed') {
            throw AppError.badRequest('This password reset request has already been completed.');
        }

        if (req.status !== 'approved') {
            throw AppError.forbidden('Invalid password reset approval state.');
        }

        // Verify token if provided
        if (req.metadata?.reset_token && resetToken && req.metadata.reset_token !== resetToken) {
            throw AppError.unauthorized('Invalid or expired password reset token.');
        }

        const hashedPassword = await PasswordService.hash(newPasswordRaw);
        await this.repo.completePasswordReset(email, hashedPassword, req.id);

        return {
            success: true,
            message: 'Your password has been successfully reset! You may now sign in with your new password.'
        };
    }
}
