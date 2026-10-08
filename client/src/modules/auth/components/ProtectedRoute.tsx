import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../../store/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, requiredPermissions }) => {
    const { isAuthenticated, hasAnyRole, hasAnyPermission, mustChangePassword } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Force user to set their own permanent password on first login
    if (mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    if (!mustChangePassword && location.pathname === '/change-password') {
        return <Navigate to="/dashboard" replace />;
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
        if (!hasAnyPermission(...requiredPermissions)) {
            return <Navigate to="/unauthorized" state={{ from: location, requiredPermissions }} replace />;
        }
    } else if (allowedRoles && !hasAnyRole(...allowedRoles)) {
        return <Navigate to="/unauthorized" state={{ from: location, allowedRoles }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
