import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowRightLeft, Loader2 } from 'lucide-react';

// An in-app confirmation, used instead of the browser's window.confirm().
//  - the safe button (Cancel) has the focus when it opens; Escape and a click outside cancel
//  - Tab stays inside the dialog; the focus returns to where it was when it closes
//  - while the action is running (`busy`) it cannot be dismissed and the buttons are disabled

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    children?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'primary' | 'danger';
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', busy = false, onConfirm, onCancel,
}) => {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const titleId = useId();
    const bodyId = useId();
    const busyRef = useRef(busy);
    busyRef.current = busy;
    const cancelRefFn = useRef(onCancel);
    cancelRefFn.current = onCancel;

    useEffect(() => {
        if (!open) return;
        const before = document.activeElement as HTMLElement | null;
        cancelRef.current?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (!busyRef.current) cancelRefFn.current();
                return;
            }
            if (e.key !== 'Tab') return;
            const order = [cancelRef.current, confirmRef.current].filter((b): b is HTMLButtonElement => !!b && !b.disabled);
            if (order.length === 0) { e.preventDefault(); return; }
            const i = order.indexOf(document.activeElement as HTMLButtonElement);
            e.preventDefault();
            const next = e.shiftKey ? (i <= 0 ? order.length - 1 : i - 1) : (i === -1 || i === order.length - 1 ? 0 : i + 1);
            order[next].focus();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            before?.focus?.();
        };
    }, [open]);

    if (!open) return null;

    const danger = tone === 'danger';
    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" data-testid="confirm-backdrop" onClick={() => { if (!busy) onCancel(); }} />
            <div
                role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}
                className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
                <div className="px-6 pt-6 pb-4 flex gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {danger ? <AlertTriangle size={20} /> : <ArrowRightLeft size={20} />}
                    </div>
                    <div className="min-w-0">
                        <h3 id={titleId} className="text-[16px] font-black text-slate-900 tracking-tight">{title}</h3>
                        <div id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-slate-500 space-y-2">{children}</div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                        ref={cancelRef} type="button" onClick={onCancel} disabled={busy}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef} type="button" onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 ${danger ? 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-400' : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-400'}`}
                    >
                        {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmDialog;
