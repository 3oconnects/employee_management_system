import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('../../../services/api', () => ({ default: api }));

import RolesTab from './RolesTab';

const roles = [
    { id: 1, name: 'admin', description: 'System admin role', dashboard_type: 'admin', is_system: true, user_count: 0, permissions: [] },
    { id: 9, name: 'Trainees', description: 'Interns', dashboard_type: 'employee', is_system: false, user_count: 0, permissions: [] },
    { id: 10, name: 'Busy Role', description: 'Has people', dashboard_type: 'employee', is_system: false, user_count: 3, permissions: [] },
];

const setup = () => {
    const props = { roles, permissions: {}, onRefresh: vi.fn(), onNotify: vi.fn() };
    const utils = render(<RolesTab {...props} />);
    return { ...props, ...utils };
};
const trash = (roleName: string) => {
    const card = screen.getByText(roleName).closest('div[class*="rounded-2xl"]') as HTMLElement;
    const buttons = card.querySelectorAll('button');
    return buttons[buttons.length - 1];   // pencil, then trash
};

beforeEach(() => { Object.values(api).forEach((f) => f.mockReset()); api.delete.mockResolvedValue({ data: { success: true } }); });

describe('RolesTab: deleting a role', () => {
    it('asks in an in-app dialog, not the browser pop-up; cancelling deletes nothing', async () => {
        const nativeConfirm = vi.spyOn(window, 'confirm');
        setup();
        fireEvent.click(trash('Trainees'));
        const dialog = await screen.findByRole('alertdialog');
        expect(dialog.textContent).toMatch(/Delete the role "Trainees"\?/);
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(api.delete).not.toHaveBeenCalled();
        expect(nativeConfirm).not.toHaveBeenCalled();
        nativeConfirm.mockRestore();
    });

    it('confirming deletes that role, refreshes the list and closes the dialog', async () => {
        const p = setup();
        fireEvent.click(trash('Trainees'));
        await screen.findByRole('alertdialog');
        fireEvent.click(screen.getByText('Delete role'));
        await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/settings/roles/9'));
        await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
        expect(p.onRefresh).toHaveBeenCalled();
        expect(p.onNotify).toHaveBeenCalledWith('Role deleted.');
    });

    it('a role that still has people never even opens the dialog', async () => {
        const p = setup();
        fireEvent.click(trash('Busy Role'));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(p.onNotify).toHaveBeenCalledWith('3 user(s) still assigned to this role.', false);
        expect(api.delete).not.toHaveBeenCalled();
    });

    it('a failed delete shows the server\'s reason and closes the dialog', async () => {
        api.delete.mockRejectedValueOnce({ message: 'Role not found or is a system role.' });
        const p = setup();
        fireEvent.click(trash('Trainees'));
        await screen.findByRole('alertdialog');
        fireEvent.click(screen.getByText('Delete role'));
        await waitFor(() => expect(p.onNotify).toHaveBeenCalledWith('Role not found or is a system role.', false));
        await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    });
});
