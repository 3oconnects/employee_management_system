import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), defaults: { baseURL: '/api/v1' } }));
vi.mock('../../../services/api', () => ({ default: api }));
// the Attendance tab is the person's own clock and has its own data needs
vi.mock('../components/AttendanceTab', () => ({ default: () => <div>ATTENDANCE-TAB</div> }));

import Profile from './Profile';
import { hiddenProfileTabs } from '../components/ProfileTabs';
import { useAuthStore } from '../../../store/authStore';

const employee = {
    id: 'E-OTH', name: 'Other Person', position: 'Engineer', department_name: 'Eng', email: 'other@x.test', phone: '+91 111',
    join_date: '2026-01-01', availability_status: 'available',
    date_of_birth: '2000-01-02', gender: 'female', address_line1: '1 Private Road', city: 'Kerala',
};
const profileFor = (access: any, extra: Record<string, any> = {}) => ({
    employee, compensation: null, documents: [], emergencyContacts: [], performanceReviews: [], leaveBalances: [],
    attendanceSummary: {}, access, ...extra,
});

const open = async (viewer: { role: string; dashboard_type: string }, profile: any) => {
    useAuthStore.setState({ user: { id: 1, name: 'Viewer', email: 'viewer@x.test', permissions: [], ...viewer } as any, isAuthenticated: true });
    api.get.mockImplementation(async (url: string) => url.startsWith('/reports/profile') ? { data: profile } : { data: [] });
    render(<MemoryRouter initialEntries={['/profile/E-OTH']}><Routes><Route path="/profile/:id" element={<Profile />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByText('Other Person').length).toBeGreaterThan(0));
};

beforeEach(() => { api.get.mockReset(); api.put.mockReset(); });

describe('hiddenProfileTabs', () => {
    it('work card only: personal, pay and the person\'s own attendance are hidden', () => {
        expect(hiddenProfileTabs({ own: false, personal: false, pay: false, edit: false }).sort())
            .toEqual(['attendance', 'compensation', 'documents', 'education', 'experience']);
    });
    it('HR sees personal records but not pay; the owner sees everything', () => {
        expect(hiddenProfileTabs({ own: false, personal: true, pay: false, edit: true }).sort()).toEqual(['attendance', 'compensation']);
        expect(hiddenProfileTabs({ own: true, personal: true, pay: true, edit: true })).toEqual([]);
    });
});

describe('opening someone else\'s profile', () => {
    it('a manager sees the work card: no private tabs, no Edit button, no birth date / gender / address, no self-service prompts', async () => {
        await open({ role: 'manager', dashboard_type: 'manager' }, profileFor({ own: false, personal: false, pay: false, edit: false }));
        for (const gone of ['Education', 'Experience', 'Compensation', 'Attendance', 'Documents']) expect(screen.queryByRole('button', { name: gone }), gone).toBeNull();
        for (const kept of ['Overview', 'Job Details', 'Leave']) expect(screen.getByRole('button', { name: kept }), kept).toBeTruthy();
        expect(screen.queryByText(/Edit Employee|Edit Profile/)).toBeNull();
        expect(screen.queryByText('Date of Birth')).toBeNull();
        expect(screen.queryByText('Gender')).toBeNull();
        expect(screen.queryByText('Address')).toBeNull();
        expect(screen.queryByText('Profile Completion')).toBeNull();
        expect(screen.queryByText('Quick Stats')).toBeNull();
        expect(screen.queryByText(/View My Projects/)).toBeNull();
        expect(screen.getByText('Email')).toBeTruthy();                       // work contact stays
        expect(screen.queryByText('Edit')).toBeNull();                         // Personal Information has no Edit button
    });

    it('HR sees personal fields and may edit, but not the Compensation tab', async () => {
        await open({ role: 'hr', dashboard_type: 'employee' }, profileFor({ own: false, personal: true, pay: false, edit: true }));
        expect(screen.getByText('Date of Birth')).toBeTruthy();
        expect(screen.getByText('Edit Employee')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Education' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Compensation' })).toBeNull();
        expect(screen.queryByText('Profile Completion')).toBeNull();           // someone else's meter is not theirs to see
    });

    it('the person themself keeps every tab, the editor and their own widgets', async () => {
        await open({ role: 'employee', dashboard_type: 'employee' }, profileFor({ own: true, personal: true, pay: true, edit: true }));
        for (const t of ['Education', 'Experience', 'Compensation', 'Attendance', 'Documents']) expect(screen.getByRole('button', { name: t }), t).toBeTruthy();
        expect(screen.getByText('Profile Completion')).toBeTruthy();
        expect(screen.getByText('Date of Birth')).toBeTruthy();
    });

    it('when the server sent no access flags, a non-owner is treated as work-card-only', async () => {
        await open({ role: 'manager', dashboard_type: 'manager' }, profileFor(undefined));
        expect(screen.queryByRole('button', { name: 'Compensation' })).toBeNull();
        expect(screen.queryByText('Date of Birth')).toBeNull();
    });

    it('a private tab left open on your own profile is not shown when you move to another person', async () => {
        useAuthStore.setState({ user: { id: 1, name: 'Viewer', email: 'viewer@x.test', role: 'manager', dashboard_type: 'manager', permissions: [] } as any, isAuthenticated: true });
        api.get.mockImplementation(async (url: string) => {
            if (url === '/reports/profile/E-MINE') return { data: profileFor({ own: true, personal: true, pay: true, edit: true }, { employee: { ...employee, id: 'E-MINE', name: 'Viewer Self' }, compensation: { annual_ctc: 100 } }) };
            if (url === '/reports/profile/E-OTH') return { data: profileFor({ own: false, personal: false, pay: false, edit: false }) };
            return { data: [] };
        });
        render(
            <MemoryRouter initialEntries={['/profile/E-MINE']}>
                <Link to="/profile/E-OTH">go-other</Link>
                <Routes><Route path="/profile/:id" element={<Profile />} /></Routes>
            </MemoryRouter>);
        await waitFor(() => expect(screen.getAllByText('Viewer Self').length).toBeGreaterThan(0));
        fireEvent.click(screen.getByRole('button', { name: 'Compensation' }));
        expect(screen.getByText('Compensation & Payroll Structure')).toBeTruthy();
        fireEvent.click(screen.getByText('go-other'));
        await waitFor(() => expect(screen.getAllByText('Other Person').length).toBeGreaterThan(0));
        expect(screen.queryByText('Compensation & Payroll Structure')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Compensation' })).toBeNull();
    });
});
