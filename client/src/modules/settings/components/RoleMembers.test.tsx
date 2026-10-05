import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../../../services/api', () => ({ default: api }));

import RoleMembers from './RoleMembers';

const role = { id: 2, name: 'manager', dashboard_type: 'manager', is_system: true, user_count: 2, permissions: [] };
const roles = [
    role,
    { id: 5, name: 'employee', dashboard_type: 'employee', is_system: true, user_count: 10, permissions: [] },
    { id: 6, name: 'hr', dashboard_type: 'admin', is_system: true, user_count: 1, permissions: [] },
];
const al = { id: 11, name: 'Al Mann', email: 'al@a.test', is_active: true, department: 'Finance', position: 'Analyst', employee_id: 'E2' };
const bea = { id: 12, name: 'Bea Cole', email: 'bea@a.test', is_active: false, department: null, position: null, employee_id: null };
const cara = { id: 21, name: 'Cara Shared', email: 'cara@a.test', is_active: true, department: 'Ops', current_role_name: 'employee' };

const setup = (over: Partial<React.ComponentProps<typeof RoleMembers>> = {}) => {
    const props = { role, roles, onChanged: vi.fn(), onNotify: vi.fn(), ...over };
    render(<RoleMembers {...props} />);
    return props;
};

beforeEach(() => {
    api.get.mockReset(); api.put.mockReset();
    api.get.mockImplementation(async (url: string, cfg: any = {}) => {
        if (url.endsWith('/members')) return { data: { items: cfg.params?.search ? [al] : [al, bea], total: cfg.params?.search ? 1 : 2 } };
        if (url.endsWith('/candidates')) return { data: { items: [cara], total: 1 } };
        throw new Error('unexpected ' + url);
    });
    api.put.mockResolvedValue({ data: { success: true } });
});

describe('RoleMembers', () => {
    it('lists who holds the role with their details and the total', async () => {
        setup();
        expect(await screen.findByText('Al Mann')).toBeTruthy();
        expect(screen.getByText('Bea Cole')).toBeTruthy();
        expect(screen.getByText(/al@a\.test · Finance · Analyst · E2/)).toBeTruthy();
        expect(screen.getByText('Inactive')).toBeTruthy();                       // Bea
        expect(screen.getByTestId('member-total').textContent).toMatch(/2 people/);
        expect(api.get).toHaveBeenCalledWith('/settings/roles/2/members', { params: { search: undefined, limit: 25, offset: 0 } });
    });

    it('says so when nobody holds the role', async () => {
        api.get.mockResolvedValueOnce({ data: { items: [], total: 0 } });
        setup();
        expect(await screen.findByText(/No one holds manager yet/)).toBeTruthy();
    });

    it('searches the members (after a short pause) and shows only the matches', async () => {
        setup();
        await screen.findByText('Al Mann');
        fireEvent.change(screen.getByLabelText('Search members'), { target: { value: 'fin' } });
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/settings/roles/2/members', { params: { search: 'fin', limit: 25, offset: 0 } }));
        await waitFor(() => expect(screen.queryByText('Bea Cole')).toBeNull());
        expect(screen.getByText('Al Mann')).toBeTruthy();
        expect(screen.getByTestId('member-total').textContent).toMatch(/1 person match "fin"/);
    });

    it('does not fire a request for every keystroke', async () => {
        setup();
        await screen.findByText('Al Mann');
        api.get.mockClear();
        const box = screen.getByLabelText('Search members');
        for (const v of ['f', 'fi', 'fin']) fireEvent.change(box, { target: { value: v } });
        await new Promise((r) => setTimeout(r, 120));            // well inside the pause: nothing has been asked yet
        expect(api.get).not.toHaveBeenCalled();
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));   // then ONE request, for the final text
        expect(api.get).toHaveBeenCalledWith('/settings/roles/2/members', { params: { search: 'fin', limit: 25, offset: 0 } });
    });

    it('"Show more" loads the next page and appends it', async () => {
        const page = (n: number) => Array.from({ length: n }, (_, i) => ({ id: 100 + i, name: `P${100 + i}`, email: `p${i}@a.test`, is_active: true }));
        api.get.mockReset();
        api.get.mockImplementationOnce(async () => ({ data: { items: page(25), total: 30 } }))
               .mockImplementationOnce(async () => ({ data: { items: [{ id: 999, name: 'Last One', email: 'l@a.test', is_active: true }], total: 30 } }));
        setup();
        await screen.findByText('P100');
        fireEvent.click(screen.getByText(/Show more \(5 more\)/));
        expect(await screen.findByText('Last One')).toBeTruthy();
        expect(api.get).toHaveBeenLastCalledWith('/settings/roles/2/members', { params: { search: undefined, limit: 25, offset: 25 } });
        expect(screen.getByText('P100')).toBeTruthy();   // the first page is still there
    });

    it('adds someone: finds them among everyone, assigns THIS role, then refreshes the list and the counts', async () => {
        const p = setup();
        await screen.findByText('Al Mann');
        fireEvent.click(screen.getByText('Add people'));
        expect(await screen.findByText('Cara Shared')).toBeTruthy();
        expect(screen.getByText(/cara@a\.test/).textContent).toMatch(/now employee/);   // shows the role they hold today
        expect(api.get).toHaveBeenCalledWith('/settings/roles/2/candidates', { params: { search: undefined, limit: 20 } });

        fireEvent.click(screen.getByLabelText('Add Cara Shared'));
        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/settings/users/21/role', { role_id: 2 }));
        await waitFor(() => expect(p.onChanged).toHaveBeenCalled());
        expect(p.onNotify).toHaveBeenCalledWith('Cara Shared added to manager.');
    });

    it('searches among the people to add', async () => {
        setup();
        await screen.findByText('Al Mann');
        fireEvent.click(screen.getByText('Add people'));
        await screen.findByText('Cara Shared');
        fireEvent.change(screen.getByLabelText('Search people to add'), { target: { value: 'cara' } });
        await waitFor(() => expect(api.get).toHaveBeenCalledWith('/settings/roles/2/candidates', { params: { search: 'cara', limit: 20 } }));
    });

    it('shows the server\'s reason when the change is refused, and does not claim success', async () => {
        api.put.mockRejectedValueOnce({ message: 'You cannot grant or change authorization that you do not hold yourself.' });
        const p = setup();
        await screen.findByText('Al Mann');
        fireEvent.click(screen.getByText('Add people'));
        await screen.findByText('Cara Shared');
        fireEvent.click(screen.getByLabelText('Add Cara Shared'));
        await waitFor(() => expect(p.onNotify).toHaveBeenCalledWith('You cannot grant or change authorization that you do not hold yourself.', false));
        expect(p.onChanged).not.toHaveBeenCalled();
    });

    it('moving a member asks in an in-app dialog (never the browser pop-up); cancelling changes nothing', async () => {
        const nativeConfirm = vi.spyOn(window, 'confirm');
        const p = setup();
        await screen.findByText('Al Mann');
        const select = screen.getByLabelText('Move Al Mann to another role');
        expect(Array.from((select as HTMLSelectElement).options).map((o) => o.text)).toEqual(['Move to…', 'employee', 'hr']); // not the role they are already in

        fireEvent.change(select, { target: { value: '5' } });
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog.textContent).toMatch(/Move Al Mann to employee\?/);
        expect(dialog.textContent).toMatch(/manager: 0 permissions → employee: 0 permissions/);
        expect(api.put).not.toHaveBeenCalled();                  // choosing only OPENS the dialog

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(api.put).not.toHaveBeenCalled();
        expect(p.onChanged).not.toHaveBeenCalled();
        expect(nativeConfirm).not.toHaveBeenCalled();
        nativeConfirm.mockRestore();
    });

    it('confirming the move assigns the chosen role, closes the dialog, and refreshes the counts', async () => {
        const p = setup();
        await screen.findByText('Al Mann');
        fireEvent.change(screen.getByLabelText('Move Al Mann to another role'), { target: { value: '5' } });
        await screen.findByRole('alertdialog');
        fireEvent.click(screen.getByText('Move to employee'));
        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/settings/users/11/role', { role_id: 5 }));
        await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
        expect(p.onChanged).toHaveBeenCalled();
        expect(p.onNotify).toHaveBeenCalledWith('Al Mann moved to employee.');
    });

    it('a refused move closes the dialog and shows the server\'s reason', async () => {
        api.put.mockRejectedValueOnce({ message: 'You cannot manage an account that holds more authority than you.' });
        const p = setup();
        await screen.findByText('Al Mann');
        fireEvent.change(screen.getByLabelText('Move Al Mann to another role'), { target: { value: '5' } });
        await screen.findByRole('alertdialog');
        fireEvent.click(screen.getByText('Move to employee'));
        await waitFor(() => expect(p.onNotify).toHaveBeenCalledWith('You cannot manage an account that holds more authority than you.', false));
        await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
        expect(p.onChanged).not.toHaveBeenCalled();
    });

    it('the dialog warns when the target role uses Admin View (full access)', async () => {
        setup();
        await screen.findByText('Al Mann');
        fireEvent.change(screen.getByLabelText('Move Al Mann to another role'), { target: { value: '6' } });   // hr = admin dashboard
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog.textContent).toMatch(/hr uses Admin View, which gives full access/);
        fireEvent.click(screen.getByText('Cancel'));
        fireEvent.change(screen.getByLabelText('Move Al Mann to another role'), { target: { value: '5' } });
        expect((await screen.findByRole('alertdialog')).textContent).not.toMatch(/Admin View/);
    });

    it('the dialog and the change are about the person whose row was used, not the first in the list', async () => {
        const p = setup();
        await screen.findByText('Bea Cole');
        fireEvent.change(screen.getByLabelText('Move Bea Cole to another role'), { target: { value: '6' } });
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog.textContent).toMatch(/Move Bea Cole to hr\?/);
        expect(dialog.textContent).not.toMatch(/Al Mann/);
        fireEvent.click(screen.getByText('Move to hr'));
        await waitFor(() => expect(api.put).toHaveBeenCalledWith('/settings/users/12/role', { role_id: 6 }));
        expect(p.onNotify).toHaveBeenCalledWith('Bea Cole moved to hr.');
    });

    it('Escape closes the dialog without changing anything', async () => {
        setup();
        await screen.findByText('Al Mann');
        fireEvent.change(screen.getByLabelText('Move Al Mann to another role'), { target: { value: '5' } });
        await screen.findByRole('alertdialog');
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(api.put).not.toHaveBeenCalled();
    });

    it('an answer that arrives after a newer search is ignored', async () => {
        let releaseFirst: (v: any) => void = () => {};
        api.get.mockReset();
        api.get.mockImplementationOnce(() => new Promise((r) => { releaseFirst = r; }))                           // the initial load, slow
               .mockImplementationOnce(async () => ({ data: { items: [bea], total: 1 } }));                       // the search, fast
        setup();
        fireEvent.change(screen.getByLabelText('Search members'), { target: { value: 'bea' } });
        expect(await screen.findByText('Bea Cole')).toBeTruthy();
        releaseFirst({ data: { items: [al, bea], total: 2 } });                                                   // the stale answer lands last
        await new Promise((r) => setTimeout(r, 30));
        expect(screen.queryByText('Al Mann')).toBeNull();
        expect(screen.getByTestId('member-total').textContent).toMatch(/1 person/);
    });

    it('switching to another role starts a fresh list', async () => {
        const { rerender } = render(<RoleMembers role={role} roles={roles} onChanged={vi.fn()} onNotify={vi.fn()} />);
        await screen.findByText('Al Mann');
        api.get.mockImplementation(async () => ({ data: { items: [{ id: 77, name: 'Hana HR', email: 'h@a.test', is_active: true }], total: 1 } }));
        rerender(<RoleMembers role={roles[2]} roles={roles} onChanged={vi.fn()} onNotify={vi.fn()} />);
        expect(await screen.findByText('Hana HR')).toBeTruthy();
        expect(screen.queryByText('Al Mann')).toBeNull();
        expect(api.get).toHaveBeenLastCalledWith('/settings/roles/6/members', { params: { search: undefined, limit: 25, offset: 0 } });
    });
});
