import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../services/api', () => ({ default: api }));

import Topbar from './Topbar';
import { useAuthStore } from '../../store/authStore';

const as = (role: string, dashboard_type: string) =>
    useAuthStore.setState({ user: { id: 1, name: 'Sri', email: 's@x.test', role, dashboard_type, permissions: [] } as any, isAuthenticated: true, accessToken: 'T' });

const openSearch = () => {
    render(<MemoryRouter><Topbar /></MemoryRouter>);
    fireEvent.click(screen.getByText('Search anything...'));
    return screen.getByRole('textbox') as HTMLInputElement;
};

beforeEach(() => {
    api.get.mockReset(); api.put.mockReset();
    api.get.mockImplementation(async (url: string) =>
        url.startsWith('/employees')
            ? { data: { items: [{ id: 'EMP010', name: 'Sridhar S', position: 'CEO', department_name: 'Management' }] } }
            : { data: { data: [], unreadCount: 0 } });
});

describe('global search is role aware', () => {
    it('an employee is offered only the pages they can open, and has no employee search', () => {
        as('employee', 'employee');
        const input = openSearch();
        expect(input.placeholder).toBe('Search pages...');
        for (const ok of ['Dashboard', 'Attendance', 'Leave', 'Timesheet', 'Payroll']) expect(screen.getByText(ok), ok).toBeTruthy();
        for (const no of ['Employees', 'Reports', 'Settings', 'Audit Logs', 'Approvals']) expect(screen.queryByText(no), no).toBeNull();
        fireEvent.change(input, { target: { value: 'sri' } });
        expect(api.get).not.toHaveBeenCalledWith('/employees', expect.anything());
        expect(screen.queryByText('Employees')).toBeNull();
    });

    it('a manager can open Employees/Approvals but not Reports or Settings', () => {
        as('manager', 'manager');
        openSearch();
        expect(screen.getByText('Employees')).toBeTruthy();
        expect(screen.getByText('Approvals')).toBeTruthy();
        expect(screen.queryByText('Reports')).toBeNull();
        expect(screen.queryByText('Settings')).toBeNull();
    });

    it('an administrator finds every page', () => {
        as('admin', 'admin');
        const input = openSearch();
        fireEvent.change(input, { target: { value: 'sett' } });
        expect(screen.getByText('Settings')).toBeTruthy();
        fireEvent.change(input, { target: { value: 'audit' } });
        expect(screen.getByText('Audit Logs')).toBeTruthy();
    });

    it('a manager can search employees: queries the API (debounced, min 2 letters) and lists matches', async () => {
        as('manager', 'manager');
        const input = openSearch();
        expect(input.placeholder).toBe('Search pages and employees...');
        fireEvent.change(input, { target: { value: 's' } });
        await new Promise(r => setTimeout(r, 350));
        expect(api.get).not.toHaveBeenCalledWith('/employees', expect.anything());
        fireEvent.change(input, { target: { value: 'sridhar' } });
        await waitFor(() => expect(screen.getByText('Sridhar S')).toBeTruthy());
        expect(api.get).toHaveBeenCalledWith('/employees', { params: { search: 'sridhar', limit: 5 } });
        expect(screen.getByText(/CEO · Management · EMP010/)).toBeTruthy();
    });

    it('says so when no employee matches', async () => {
        as('manager', 'manager');
        api.get.mockImplementation(async (url: string) => url.startsWith('/employees') ? { data: { items: [] } } : { data: { data: [] } });
        const input = openSearch();
        fireEvent.change(input, { target: { value: 'zzz' } });
        await waitFor(() => expect(screen.getByText('No employees match')).toBeTruthy());
    });
});
