import React, { useState, useEffect } from 'react';
import { 
    KeyRound, Mail, Lock, CheckCircle2, Clock, XCircle, 
    X, Loader2, ArrowRight, ShieldCheck, RefreshCw, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

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
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
                className="relative bg-white border border-slate-200/90 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Ambient Accent */}
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {/* Close Button */}
                <button
                    onClick={handleResetAll}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all"
                    title="Close"
                >
                    <X size={16} />
                </button>

                <div className="p-7">
                    {/* ──────────────── STEP 1: REQUEST ──────────────── */}
                    {step === 'request' && (
                        <form onSubmit={handleRequestReset} className="space-y-5">
                            <div className="flex items-center gap-3.5 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                                    <KeyRound size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Forgot Password</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Submit a secure password reset request to your System Administrator.
                                    </p>
                                </div>
                            </div>

                            <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-[11px] text-slate-600 leading-relaxed flex items-start gap-2.5">
                                <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                <span>
                                    For organization security, password resets require <strong>Administrator Authorization</strong>. Once approved in the Approvals queue, you will be permitted to create a new password.
                                </span>
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                                        Registered Work Email
                                    </label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="operator@company.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                        <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            Reason for Reset
                                        </label>
                                        <span className="text-[10px] text-slate-400">Required for Admin Review</span>
                                    </div>

                                    {/* Preset Reason Quick Pills */}
                                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                                        {[
                                            'Forgotten password',
                                            'Account locked out',
                                            'New device / security refresh',
                                            'Temporary credentials expired'
                                        ].map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setReason(preset)}
                                                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                                                    reason === preset 
                                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold shadow-xs' 
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>

                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="Or type custom reason (e.g. Lost access after browser update)"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex flex-col gap-2.5">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>Submitting Request...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Submit Request to Admin</span>
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCheckStatus}
                                    disabled={checkingStatus || !email}
                                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {checkingStatus ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                    <span>Already requested? Check approval status</span>
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ──────────────── STEP 2: PENDING ADMIN APPROVAL ──────────────── */}
                    {step === 'pending' && (
                        <div className="space-y-5 text-center py-2">
                            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200/80 text-amber-600 mx-auto flex items-center justify-center relative shadow-sm">
                                <Clock size={32} className="animate-pulse" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-white animate-ping" />
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Sent to Administrator</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                                    Your password reset authorization request for <strong className="text-slate-800 font-semibold">{email}</strong> has been routed to the Administrator.
                                </p>
                            </div>

                            {/* Status Card */}
                            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Approval Status</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        Pending Admin Review
                                    </span>
                                </div>
                                {requestId && (
                                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                                        <span className="text-slate-400 font-medium">Request Reference</span>
                                        <span className="font-mono font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                            {requestId}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2 flex flex-col gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleCheckStatus}
                                    disabled={checkingStatus}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {checkingStatus ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            <span>Checking Approval Status...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw size={15} />
                                            <span>Check Approval Status</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setStep('request')}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1"
                                >
                                    Change email address
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ──────────────── STEP 3: APPROVED (ENTER NEW PASSWORD) ──────────────── */}
                    {step === 'approved' && (
                        <form onSubmit={handlePerformReset} className="space-y-5">
                            <div className="flex items-center gap-3.5 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Admin Approved!</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                            Verified
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Your request is authorized. Please set your new secure password.
                                    </p>
                                </div>
                            </div>

                            {statusMessage && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-medium text-emerald-800">
                                    {statusMessage}
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                                    <AlertCircle size={15} className="flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Minimum 6 characters"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                        >
                                            {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter new password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-11 text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                        >
                                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={15} />
                                        <span>Save & Complete Reset</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ──────────────── STEP 4: SUCCESS ──────────────── */}
                    {step === 'success' && (
                        <div className="text-center py-4 space-y-5">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                                <CheckCircle2 size={34} />
                            </div>

                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Password Reset Complete!</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                                    Your password has been successfully updated in the system. You can now log in with your new credentials.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <span>Return to Sign In</span>
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
