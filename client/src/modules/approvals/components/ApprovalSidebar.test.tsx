import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApprovalSidebar from './ApprovalSidebar';
import { useAuthStore } from '../../../store/authStore';

const as = (role: string, permissions: string[], dashboard_type = 'manager') =>
    useAuthStore.setState({ user: { id: 1, name: 'S', email: 's@x', role, dashboard_type, permissions } as any, isAuthenticated: true });
const show = (counts: Record<string, number> = {}) =>
    render(<ApprovalSidebar filterType="all" setFilterType={() => {}} isCollapsed={false} setIsCollapsed={() => {}} counts={counts} />);

beforeEach(() => useAuthStore.setState({ user: null, isAuthenticated: false }));

describe('ApprovalSidebar follows the role\'s permissions', () => {
    it('a manager with only leave approval sees All + Leave, not password reset / department / promotion', () => {
        as('manager', ['leave:approve']);
        show();
        expect(screen.getByText('All Requests')).toBeTruthy();
        expect(screen.getByText('Leave Request')).toBeTruthy();
        for (const hidden of ['Password Reset', 'Department Requests', 'Team Requests', 'Promotion Request', 'Role Request', 'Attendance Request'])
            expect(screen.queryByText(hidden), hidden).toBeNull();
    });

    it('permissions unlock their categories', () => {
        as('manager', ['approvals:approve', 'settings:manage', 'organization:manage', 'attendance:manage']);
        show();
        for (const shown of ['Password Reset', 'Department Requests', 'Team Requests', 'Promotion Request', 'Role Request', 'Attendance Request'])
            expect(screen.getByText(shown), shown).toBeTruthy();
        expect(screen.queryByText('Leave Request')).toBeNull();
    });

    it('an administrator sees everything', () => {
        as('admin', [], 'admin');
        show();
        expect(screen.getByText('Password Reset')).toBeTruthy();
        expect(screen.getByText('Leave Request')).toBeTruthy();
    });

    it('a category with something waiting is never hidden', () => {
        as('manager', []);
        show({ promotion: 2 });
        expect(screen.getByText('Promotion Request')).toBeTruthy();
        expect(screen.queryByText('Password Reset')).toBeNull();
    });
});
