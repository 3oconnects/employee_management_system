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

        const validPassword = await PasswordService.compare(passwordRaw, user.password);
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

    async changePassword(userId: number, currentPassword: string, newPassword: string) {
        const hashedOld = await this.repo.getPassword(userId);
        const valid = await PasswordService.compare(currentPassword, hashedOld);
        if (!valid) throw AppError.unauthorized('Incorrect current password.');

        const hashedNew = await PasswordService.hash(newPassword);
        await this.repo.updatePassword(userId, hashedNew);
    }
}
