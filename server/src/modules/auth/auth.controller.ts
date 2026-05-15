import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuditService } from '../../services/auditService';
import { AuditAction, AuthenticatedRequest } from '../../types';
import { RealtimeService } from '../../services/realtimeService';
import { EventPublisher } from '../../core/events/eventPublisher';
import { DomainEventType } from '../../core/events/eventTypes';
const service = new AuthService();

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    const result = await service.login(email.trim(), password.trim());

    EventPublisher.publish(DomainEventType.AUDIT_LOG_REQUESTED, result.user.tenant_id, {
        action: AuditAction.LOGIN,
        entityType: 'user',
        entityId: String(result.user.id),
        details: {
            ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip || '',
            userAgent: req.headers['user-agent'] || ''
        }
    }, result.user.id);

    res.json({
        success: true,
        accessToken: result.accessToken,
        token: result.accessToken, 
        refreshToken: result.refreshToken,
        mustChangePassword: result.user.is_password_temp || false,
        user: {
            id: result.user.id,
            tenant_id: result.user.tenant_id,
            employee_id: result.user.employee_id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            dashboard_type: result.user.dashboard_type || 'employee',
            availability_status: result.user.availability_status || 'available',
            phone: result.user.phone || '',
            address: result.user.address || '',
            emergency: result.user.emergency || '',
            permissions: result.permissions,
        },
    });
};

export const refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    const token = refreshToken || (() => {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];
        return null;
    })();

    if (!token) return res.status(401).json({ success: false, message: 'No refresh token provided.' });

    const result = await service.refresh(token);
    
    res.json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
    });
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
        await service.logout(req.user.userId);

        EventPublisher.publish(DomainEventType.AUDIT_LOG_REQUESTED, req.user.tenantId, {
            action: AuditAction.LOGOUT,
            entityType: 'user',
            entityId: String(req.user.userId),
            details: {}
        }, req.user.userId);
    }

    res.json({ success: true, message: 'Logged out successfully.' });
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
    const profile = await service.getProfile(req.user!.userId, req.user!.permissions);
    res.json({ success: true, user: profile });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    const user = await service.updateProfile(req.user!.userId, req.body);
    
    EventPublisher.publish(DomainEventType.AUDIT_LOG_REQUESTED, req.user!.tenantId, {
        action: AuditAction.UPDATE,
        entityType: 'user',
        entityId: String(req.user!.userId),
        details: { newValues: req.body }
    }, req.user!.userId);

    res.json({ success: true, message: 'Profile updated successfully.', user });
};

export const updatePreferences = async (req: AuthenticatedRequest, res: Response) => {
    await service.updatePreferences(req.user!.userId, req.body.preferences);
    res.json({ success: true, message: 'Preferences updated.' });
};

export const updateStatus = async (req: AuthenticatedRequest, res: Response) => {
    await service.updateStatus(req.user!.userId, req.body.status);
    
    EventPublisher.publish(DomainEventType.REALTIME_BROADCAST_REQUESTED, req.user!.tenantId, {
        userId: req.user!.userId,
        email: req.user!.email,
        status: req.body.status
    });

    res.json({ success: true, message: 'Status updated.' });
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
    await service.changePassword(req.user!.userId, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: 'Password updated successfully.' });
};

export const repairIdentity = async (req: Request, res: Response) => {
    res.send("Identity Baseline Restoration is disabled in secure mode. Please run database seeds manually.");
};
