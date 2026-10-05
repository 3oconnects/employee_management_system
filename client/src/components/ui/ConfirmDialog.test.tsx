import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

const setup = (over: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
    const onConfirm = vi.fn(); const onCancel = vi.fn();
    const utils = render(
        <ConfirmDialog open title="Move Sridhar to manager?" confirmLabel="Move" onConfirm={onConfirm} onCancel={onCancel} {...over}>
            <p>Details here</p>
        </ConfirmDialog>
    );
    return { onConfirm, onCancel, ...utils };
};

describe('ConfirmDialog', () => {
    it('is an accessible alert dialog with its title and body', () => {
        setup();
        const d = screen.getByRole('alertdialog');
        expect(d.getAttribute('aria-modal')).toBe('true');
        expect(d.getAttribute('aria-labelledby')).toBeTruthy();
        expect(screen.getByText('Move Sridhar to manager?').id).toBe(d.getAttribute('aria-labelledby'));
        expect(document.getElementById(d.getAttribute('aria-describedby')!)!.textContent).toContain('Details here');
    });

    it('renders nothing when closed', () => {
        setup({ open: false });
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('puts the focus on the SAFE button (Cancel), so a stray Enter cannot confirm', () => {
        setup();
        expect(document.activeElement).toBe(screen.getByText('Cancel'));
    });

    it('confirm and cancel buttons call their handlers', () => {
        const { onConfirm, onCancel } = setup();
        fireEvent.click(screen.getByText('Move'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('Escape cancels; a click outside cancels', () => {
        const { onCancel } = setup();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByTestId('confirm-backdrop'));
        expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('Tab and Shift+Tab stay inside the dialog (cycle Cancel <-> Confirm)', () => {
        setup();
        const cancel = screen.getByText('Cancel'); const confirm = screen.getByText('Move');
        expect(document.activeElement).toBe(cancel);
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(confirm);
        fireEvent.keyDown(document, { key: 'Tab' });
        expect(document.activeElement).toBe(cancel);
        fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
        expect(document.activeElement).toBe(confirm);
    });

    it('while busy it cannot be dismissed and the buttons are disabled', () => {
        const { onCancel, onConfirm } = setup({ busy: true });
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.click(screen.getByTestId('confirm-backdrop'));
        expect(onCancel).not.toHaveBeenCalled();
        const cancel = screen.getByText('Cancel') as HTMLButtonElement; const confirm = screen.getByText('Move').closest('button') as HTMLButtonElement;
        expect(cancel.disabled).toBe(true);
        expect(confirm.disabled).toBe(true);
        expect(confirm.getAttribute('aria-busy')).toBe('true');
        fireEvent.click(confirm);
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('the danger tone is styled as destructive and uses the given labels', () => {
        setup({ tone: 'danger', confirmLabel: 'Delete role', cancelLabel: 'Keep it' });
        expect(screen.getByText('Delete role').closest('button')!.className).toMatch(/bg-rose-600/);
        expect(screen.getByText('Keep it')).toBeTruthy();
    });

    it('gives the focus back to what had it before, when it closes', () => {
        const Host = () => {
            const [open, setOpen] = useState(false);
            return (
                <>
                    <button onClick={() => setOpen(true)}>Open it</button>
                    <ConfirmDialog open={open} title="T" onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />
                </>
            );
        };
        render(<Host />);
        const opener = screen.getByText('Open it');
        opener.focus();
        fireEvent.click(opener);
        expect(document.activeElement).toBe(screen.getByText('Cancel'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('stops listening to the keyboard once closed', () => {
        const onCancel = vi.fn();
        const { rerender } = render(<ConfirmDialog open title="T" onConfirm={vi.fn()} onCancel={onCancel} />);
        rerender(<ConfirmDialog open={false} title="T" onConfirm={vi.fn()} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();
    });
});
