import React from 'react';
import { useAuthStore, UserRole } from '../../../store/authStore';

interface CanProps {
    perform: string; // permission name e.g. 'employee:delete'
    role?: UserRole;  // option role check
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

const Can: React.FC<CanProps> = ({ perform, role, children, fallback = null }) => {
    const { user } = useAuthStore();

    if (!user) return <>{fallback}</>;

    // Role check if provided
    if (role && user.role !== role) {
        return <>{fallback}</>;
    }

    // Permission check
    const hasPermission = user.permissions.includes(perform);

    return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default Can;
