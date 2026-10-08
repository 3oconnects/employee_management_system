import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Mail, CheckCircle2, X } from 'lucide-react';
import api from '../../../services/api';
import { Alert, Button, FormField, PasswordInput, TextInput } from '../../../components/ui';

// Password reset by emailed link (HF-3):
//   request  -> the user enters their email; the server always answers the same way
//   sent     -> generic confirmation ("if an account exists, we sent a link")
//   reset    -> opened from the emailed link; the one-time token comes from the URL fragment
//   success  -> done
// The browser never learns whether an account exists and never sees a token from the API.
// All checks are enforced again by the server; this component is only a form.

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialEmail?: string;
    /** One-time token from the emailed link. When present the modal opens on the "reset" step. */
    resetToken?: string | null;
}

type ModalStep = 'request' | 'sent' | 'reset' | 'success';

// The API client rejects with { message }; older call sites read err.response.data.message.
const errorMessage = (err: any, fallback: string): string =>
    err?.message || err?.response?.data?.message || fallback;

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
    isOpen,
    onClose,
    initialEmail = '',
    resetToken = null,
}) => {
    const [step, setStep] = useState<ModalStep>(resetToken ? 'reset' : 'request');
    const [email, setEmail] = useState(initialEmail);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialEmail) setEmail(initialEmail);
            setError(null);
        }
    }, [isOpen, initialEmail]);

    // A reset link always lands on the reset step.
    useEffect(() => {
        if (isOpen && resetToken) setStep('reset');
    }, [isOpen, resetToken]);

    const dialogRef = useRef<HTMLDivElement>(null);

    // Dialog behaviour: move focus into the dialog on open; Escape closes it.
    useEffect(() => {
        if (!isOpen) return;
        dialogRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email.trim()) {
            setError('Enter your work email.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', { email: email.trim() });
            setStatusMessage(res.data?.message ?? null);
            setStep('sent');
        } catch (err: any) {
            setError(errorMessage(err, 'We could not send the request. Check the email address and try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token: resetToken, newPassword });
            setNewPassword('');
            setConfirmPassword('');
            setStep('success');
        } catch (err: any) {
            setError(errorMessage(err, 'We could not reset your password. Request a new link and try again.'));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('request');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setStatusMessage(null);
        onClose();
    };

    const requestNewLink = () => {
        setError(null);
        setStep('request');
    };

    const titles: Record<ModalStep, string> = {
        request: 'Reset your password',
        sent: 'Check your email',
        reset: 'Set a new password',
        success: 'Password updated',
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-nx-fg/40 p-4 font-nx">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="forgot-password-title"
                tabIndex={-1}
                className="relative w-full max-w-md rounded-xl border border-nx-border bg-nx-surface shadow-nx-md focus:outline-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-nx-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-nx-primary-subtle text-nx-primary" aria-hidden>
                            {step === 'request' || step === 'reset' ? <KeyRound size={18} /> : step === 'sent' ? <Mail size={18} /> : <CheckCircle2 size={18} />}
                        </span>
                        <h2 id="forgot-password-title" className="text-base font-semibold text-nx-fg">{titles[step]}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-nx-fg-subtle hover:bg-nx-surface-muted hover:text-nx-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                <div className="px-6 py-5">
                    {/* ── Step 1: request a link ── */}
                    {step === 'request' && (
                        <form onSubmit={handleRequest} noValidate className="space-y-4">
                            <p className="text-sm text-nx-fg-muted">
                                Enter your work email and we will send you a link to choose a new password.
                            </p>

                            {error && <Alert tone="danger">{error}</Alert>}

                            <FormField label="Work email">
                                <TextInput
                                    type="email"
                                    autoComplete="username"
                                    leadingIcon={<Mail size={16} />}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                />
                            </FormField>

                            <Button type="submit" fullWidth loading={loading}>
                                {loading ? 'Sending…' : 'Send reset link'}
                            </Button>
                        </form>
                    )}

                    {/* ── Step 2: generic confirmation (same text whether or not the account exists) ── */}
                    {step === 'sent' && (
                        <div className="space-y-4">
                            <p className="text-sm text-nx-fg-muted" role="status">
                                {statusMessage || 'If an account exists for that email, we have sent a password reset link.'}
                            </p>
                            <p className="text-xs text-nx-fg-subtle">
                                Nothing arrived? Check your spam folder, or try again in a minute.
                            </p>
                            <div className="flex flex-col gap-2 pt-1">
                                <Button fullWidth onClick={handleClose}>Back to sign in</Button>
                                <Button variant="ghost" fullWidth onClick={requestNewLink}>Use a different email</Button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: opened from the emailed link, set a new password ── */}
                    {step === 'reset' && (
                        <form onSubmit={handleReset} noValidate className="space-y-4">
                            {error && <Alert tone="danger">{error}</Alert>}

                            <FormField label="New password" hint="At least 6 characters.">
                                <PasswordInput
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </FormField>

                            <FormField label="Confirm new password">
                                <PasswordInput
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </FormField>

                            <div className="flex flex-col gap-2">
                                <Button type="submit" fullWidth loading={loading}>
                                    {loading ? 'Saving…' : 'Save new password'}
                                </Button>
                                {error && (
                                    <Button variant="ghost" fullWidth onClick={requestNewLink}>
                                        Request a new link
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* ── Step 4: success ── */}
                    {step === 'success' && (
                        <div className="space-y-4">
                            <p className="text-sm text-nx-fg-muted">
                                Your password has been updated. You can now sign in with your new password.
                            </p>
                            <Button fullWidth onClick={handleClose}>Back to sign in</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
