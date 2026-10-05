import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./api', () => ({ default: api }));
const toastInfo = vi.hoisted(() => vi.fn());
vi.mock('../components/ui', () => ({ toast: { info: toastInfo, success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

import { syncSession, resetSessionSync } from './sessionSync';
import { useSessionSync } from '../hooks/useSessionSync';
import { useAuthStore } from '../store/authStore';
import dashboardSource from '../modules/dashboard/pages/Dashboard.tsx?raw';

const employee = { id: 7, name: 'Sridhar', email: 's@x.test', role: 'employee', dashboard_type: 'employee', permissions: ['attendance:view', 'leave:view'], availability_status: 'available' } as any;

const signIn = (user = employee, refreshToken: string | null = 'R1') => {
    useAuthStore.setState({ user, isAuthenticated: true, accessToken: 'A1', refreshToken });
};
const server = (over: Record<string, unknown> = {}) => {
    api.get.mockResolvedValue({ data: { user: { ...employee, ...over } } });
};
const state = () => useAuthStore.getState();

beforeEach(() => {
    api.get.mockReset(); api.post.mockReset(); toastInfo.mockReset();
    api.post.mockResolvedValue({ data: { accessToken: 'A2', refreshToken: 'R2' } });
    resetSessionSync();
    signIn();
});

describe('syncSession', () => {
    it('does nothing about tokens when your access is unchanged (and refreshes harmless fields)', async () => {
        server({ availability_status: 'busy', name: 'Sridhar K' });
        expect(await syncSession({ force: true })).toBe(false);
        expect(api.post).not.toHaveBeenCalled();
        expect(state().accessToken).toBe('A1');
        expect(state().user).toMatchObject({ role: 'employee', availability_status: 'busy', name: 'Sridhar K' });
    });

    it('a changed role: takes a NEW token with the stored refresh token, then updates the screen', async () => {
        server({ role: 'manager', dashboard_type: 'manager', permissions: ['attendance:view', 'leave:view', 'leave:approve'] });
        expect(await syncSession({ force: true })).toBe(true);
        expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'R1' });
        expect(state().accessToken).toBe('A2');
        expect(state().refreshToken).toBe('R2');
        expect(state().user).toMatchObject({ role: 'manager', dashboard_type: 'manager' });
        expect(state().user!.permissions).toEqual(['attendance:view', 'leave:view', 'leave:approve']);
    });

    it('the token is renewed BEFORE the screen changes (the server must agree with what is shown)', async () => {
        server({ role: 'manager', dashboard_type: 'manager', permissions: ['leave:approve'] });
        let roleWhenRefreshing = '';
        api.post.mockImplementation(async () => { roleWhenRefreshing = state().user!.role; return { data: { accessToken: 'A2', refreshToken: 'R2' } }; });
        await syncSession({ force: true });
        expect(roleWhenRefreshing).toBe('employee');
        expect(state().user!.role).toBe('manager');
    });

    it('a change of dashboard type alone, or of permissions alone, counts as a change', async () => {
        server({ dashboard_type: 'manager' });
        expect(await syncSession({ force: true })).toBe(true);
        signIn(); resetSessionSync(); api.post.mockClear();
        server({ permissions: ['attendance:view', 'leave:view', 'reports:view'] });
        expect(await syncSession({ force: true })).toBe(true);
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('a role renamed/changed with the same dashboard type and permissions still counts as a change', async () => {
        server({ role: 'team_lead' });
        expect(await syncSession({ force: true })).toBe(true);
        expect(api.post).toHaveBeenCalledTimes(1);
        expect(state().user!.role).toBe('team_lead');
    });

    it('the same permissions in a different order are not a change', async () => {
        server({ permissions: ['leave:view', 'attendance:view'] });
        expect(await syncSession({ force: true })).toBe(false);
        expect(api.post).not.toHaveBeenCalled();
    });

    it('if the new token cannot be obtained, the access fields are NOT changed, and it tries again soon', async () => {
        server({ role: 'manager', dashboard_type: 'manager', permissions: ['leave:approve'], availability_status: 'busy' });
        api.post.mockRejectedValueOnce(new Error('network'));
        expect(await syncSession({ force: true })).toBe(false);
        expect(state().user).toMatchObject({ role: 'employee', dashboard_type: 'employee', availability_status: 'busy' });
        expect(state().accessToken).toBe('A1');
        // not throttled after a failure: the next ordinary call goes through
        expect(await syncSession()).toBe(true);
        expect(state().user!.role).toBe('manager');
    });

    it('without a refresh token it cannot upgrade the session, so it leaves access alone', async () => {
        signIn(employee, null);
        server({ role: 'manager', dashboard_type: 'manager' });
        expect(await syncSession({ force: true })).toBe(false);
        expect(state().user!.role).toBe('employee');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('a failing /auth/me changes nothing', async () => {
        api.get.mockRejectedValue(new Error('500'));
        expect(await syncSession({ force: true })).toBe(false);
        expect(state().user).toMatchObject({ role: 'employee' });
    });

    it('does nothing when nobody is signed in', async () => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
        expect(await syncSession({ force: true })).toBe(false);
        expect(api.get).not.toHaveBeenCalled();
    });

    it('is throttled (once a minute) unless forced, and simultaneous calls share one request', async () => {
        server();
        await Promise.all([syncSession({ force: true }), syncSession({ force: true }), syncSession({ force: true })]);
        expect(api.get).toHaveBeenCalledTimes(1);
        await syncSession();                       // within the minute
        expect(api.get).toHaveBeenCalledTimes(1);
        await syncSession({ force: true });
        expect(api.get).toHaveBeenCalledTimes(2);
    });
});

describe('useSessionSync', () => {
    const Host: React.FC = () => { useSessionSync(); return null; };

    it('syncs once when the app opens and tells the person when their access changed', async () => {
        server({ role: 'manager', dashboard_type: 'manager', permissions: ['leave:approve'] });
        render(<Host />);
        await waitFor(() => expect(state().user!.role).toBe('manager'));
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(toastInfo).toHaveBeenCalledWith('Your access was updated by an administrator.');
    });

    it('says nothing when nothing changed, and does not repeat on every focus within a minute', async () => {
        server();
        render(<Host />);
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        fireEvent(window, new Event('focus'));
        fireEvent(window, new Event('focus'));
        await new Promise((r) => setTimeout(r, 20));
        expect(api.get).toHaveBeenCalledTimes(1);
        expect(toastInfo).not.toHaveBeenCalled();
    });

    it('does not run for a signed-out visitor', async () => {
        useAuthStore.setState({ user: null, isAuthenticated: false });
        const add = vi.spyOn(window, 'addEventListener');
        render(<Host />);
        await new Promise((r) => setTimeout(r, 20));
        expect(api.get).not.toHaveBeenCalled();
        expect(add.mock.calls.filter(([t]) => t === 'focus')).toHaveLength(0);   // no listeners either
        add.mockRestore();
    });

    it('stops listening when it unmounts', async () => {
        server();
        const { unmount } = render(<Host />);
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        unmount();
        resetSessionSync();
        fireEvent(window, new Event('focus'));
        await new Promise((r) => setTimeout(r, 20));
        expect(api.get).toHaveBeenCalledTimes(1);
    });
});

describe('the dashboard follows the current role', () => {
    it('reloads its data when the role or dashboard type changes (static guard on the effect dependencies)', async () => {
        const src = dashboardSource;
        expect(src).toMatch(/useEffect\(\(\)=>\{loadData\(\);\},\[user\?\.id, user\?\.dashboard_type, user\?\.role\]\)/);
        expect(src).not.toMatch(/api\.get\('\/auth\/me'\)/);   // one place asks the server who you are
    });
});
