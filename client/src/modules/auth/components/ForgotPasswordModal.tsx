import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Mail, CheckCircle2, Clock, X, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { Alert, Button, FormField, PasswordInput, TextInput } from '../../../components/ui';

// NOTE: this restyle changes presentation only. The admin-approval reset flow
// (request → poll status → reset) is unchanged; its security issues are
// tracked as S2 in docs/audit/EMS_REMEDIATION_BASELINE.md (Release 1).

const REASON_PRESETS = [
    'Forgotten password',
    'Account locked out',
    'New device / security refresh',
    'Temporary credentials expired',
];

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialEmail?: string;
    onResetSuccess?: (newPassword: string, email: string) => void;
}

type ModalStep = 'request' | 'pending' | 'approved' | 'success';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
    isOpen,
    onClose,
    initialEmail = '',
    onResetSuccess
}) => {
    const [step, setStep] = useState<ModalStep>('request');
    const [email, setEmail] = useState(initialEmail);
    const [reason, setReason] = useState('');
    const [requestId, setRequestId] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string | null>(null);

    // Reset Form state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UX state
    const [loading, setLoading] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Sync initialEmail when opened
    useEffect(() => {
        if (isOpen) {
            if (initialEmail) setEmail(initialEmail);
            setError(null);
            setStatusMessage(null);
        }
    }, [isOpen, initialEmail]);

    // Poll status while in 'pending' step
    useEffect(() => {
        let interval: any;
        if (isOpen && step === 'pending' && email) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get('/auth/forgot-password/status', {
                        params: { email: email.trim() }
                    });
                    if (res.data.status === 'approved') {
                        setStep('approved');
                        setResetToken(res.data.resetToken || null);
                        setStatusMessage(res.data.message);
                        setError(null);
                    } else if (res.data.status === 'rejected') {
                        setError('Your password reset request was rejected by the Administrator.');
                    }
                } catch (err) {
                    // silent polling fail
                }
            }, 3500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isOpen, step, email]);

    const dialogRef = useRef<HTMLDivElement>(null);

    // Dialog behaviour: move focus into the dialog on open; Escape closes it.
    useEffect(() => {
        if (!isOpen) return;
        dialogRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleResetAll();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    // 1. Submit Request to Admin
    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatusMessage(null);
        if (!email.trim()) {
            setError('Please provide your registered work email.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/forgot-password', {
                email: email.trim(),
                reason: reason.trim() || undefined
            });

            setRequestId(res.data.requestId);
            if (res.data.status === 'approved') {
                setStep('approved');
                setResetToken(res.data.resetToken || null);
                setStatusMessage('Your request has already been approved by Admin! Enter your new password below.');
            } else {
                setStep('pending');
                setStatusMessage(res.data.message);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit password reset request. Verify your email.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Manual Check Status
    const handleCheckStatus = async () => {
        if (!email.trim()) return;
        setCheckingStatus(true);
        setError(null);
        try {
            const res = await api.get('/auth/forgot-password/status', {
                params: { email: email.trim() }
            });

            if (res.data.status === 'approved') {
                setStep('approved');
                setResetToken(res.data.resetToken || null);
                setStatusMessage('Admin approved your request! You can now set your new password.');
            } else if (res.data.status === 'rejected') {
                setError('Your request was rejected by the Administrator. Please contact HR.');
            } else if (res.data.status === 'pending') {
                setStatusMessage('Request is still pending Administrator approval in the Approvals portal.');
            } else {
                setError('No active password reset request found. You can submit a new request.');
                setStep('request');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to check request status.');
        } finally {
            setCheckingStatus(false);
        }
    };

    // 3. Set New Password (Only allowed when approved)
    const handlePerformReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match. Please verify.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email: email.trim(),
                newPassword: newPassword,
                resetToken: resetToken || undefined,
                requestId: requestId || undefined
            });

            setStep('success');
            if (onResetSuccess) {
                onResetSuccess(newPassword, email.trim());
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update password. Ensure admin approval is active.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetAll = () => {
        setStep('request');
        setNewPassword('');
        setConfirmPassword('');
        setError(null);
        setStatusMessage(null);
        onClose();
    };

    const titles: Record<ModalStep, string> = {
        request: 'Reset your password',
        pending: 'Request sent',
        approved: 'Set a new password',
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
                            {step === 'pending' ? <Clock size={18} /> : step === 'request' ? <KeyRound size={18} /> : <CheckCircle2 size={18} />}
                        </span>
                        <h2 id="forgot-password-title" className="text-base font-semibold text-nx-fg">{titles[step]}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetAll}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-nx-fg-subtle hover:bg-nx-surface-muted hover:text-nx-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>

                <div className="px-6 py-5">
                    {/* ── Step 1: request ── */}
                    {step === 'request' && (
                        <form onSubmit={handleRequestReset} noValidate className="space-y-4">
                            <p className="text-sm text-nx-fg-muted">
                                Password resets are approved by your administrator. Submit a request, and once it is
                                approved you can set a new password here.
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

                            <FormField label="Reason" hint="Helps your administrator review the request.">
                                <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Common reasons">
                                    {REASON_PRESETS.map(preset => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setReason(preset)}
                                            aria-pressed={reason === preset}
                                            className={`rounded-md border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary ${
                                                reason === preset
                                                    ? 'border-nx-primary bg-nx-primary-subtle text-nx-primary'
                                                    : 'border-nx-border bg-nx-surface text-nx-fg-muted hover:bg-nx-surface-muted'
                                            }`}
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                                <TextInput
                                    type="text"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Or describe the reason"
                                />
                            </FormField>

                            <div className="flex flex-col gap-2 pt-1">
                                <Button type="submit" fullWidth loading={loading}>
                                    {loading ? 'Submitting…' : 'Submit request'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={handleCheckStatus}
                                    disabled={checkingStatus || !email}
                                    loading={checkingStatus}
                                    icon={<RefreshCw size={14} aria-hidden />}
                                >
                                    Already requested? Check status
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* ── Step 2: pending administrator approval ── */}
                    {step === 'pending' && (
                        <div className="space-y-4">
                            <p className="text-sm text-nx-fg-muted">
                                Your request for <span className="font-medium text-nx-fg">{email}</span> is waiting for
                                administrator approval. This window checks for updates automatically.
                            </p>

                            <dl className="divide-y divide-nx-border rounded-lg border border-nx-border text-sm">
                                <div className="flex items-center justify-between px-3.5 py-2.5">
                                    <dt className="text-nx-fg-muted">Status</dt>
                                    <dd className="inline-flex items-center rounded-md bg-nx-warning-subtle px-2 py-0.5 text-xs font-medium text-nx-warning">
                                        Pending approval
                                    </dd>
                                </div>
                                {requestId && (
                                    <div className="flex items-center justify-between px-3.5 py-2.5">
                                        <dt className="text-nx-fg-muted">Reference</dt>
                                        <dd className="font-mono text-xs text-nx-fg">{requestId}</dd>
                                    </div>
                                )}
                            </dl>

                            {statusMessage && !error && <p className="text-xs text-nx-fg-subtle" role="status">{statusMessage}</p>}
                            {error && <Alert tone="danger">{error}</Alert>}

                            <div className="flex flex-col gap-2 pt-1">
                                <Button
                                    fullWidth
                                    onClick={handleCheckStatus}
                                    loading={checkingStatus}
                                    icon={<RefreshCw size={14} aria-hidden />}
                                >
                                    {checkingStatus ? 'Checking…' : 'Check status'}
                                </Button>
                                <Button variant="ghost" fullWidth onClick={() => setStep('request')}>
                                    Use a different email
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: approved, set a new password ── */}
                    {step === 'approved' && (
                        <form onSubmit={handlePerformReset} noValidate className="space-y-4">
                            <Alert tone="success" title="Request approved">
                                {statusMessage || 'You can now set a new password.'}
                            </Alert>

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

                            <Button type="submit" fullWidth loading={loading}>
                                {loading ? 'Saving…' : 'Save new password'}
                            </Button>
                        </form>
                    )}

                    {/* ── Step 4: success ── */}
                    {step === 'success' && (
                        <div className="space-y-4">
                            <p className="text-sm text-nx-fg-muted">
                                Your password has been updated. You can now sign in with your new password.
                            </p>
                            <Button fullWidth onClick={handleResetAll}>
                                Back to sign in
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
