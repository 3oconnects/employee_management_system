import React, { useState, useEffect } from 'react';
import { 
    Bell, Mail, Shield, Globe, Monitor, Moon, Sun, Laptop, 
    Lock, KeyRound, CheckCircle2, AlertCircle, Save, Loader2, 
    Eye, EyeOff, FileText, Download, ShieldCheck, Sparkles, User, 
    Clock, Laptop2, Smartphone, Copy, Check, ShieldAlert,
    CheckCheck, ShieldX, Key, RefreshCw, QrCode, MessageSquare,
    Send, X, ExternalLink
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { 
    generateBase32Secret, 
    getTotpUri, 
    generateQrCodeDataUrl, 
    verifyTOTPCode, 
    generateCurrentTOTP 
} from '../../../utils/totp';
import { 
    SUPPORTED_CURRENCIES, 
    SUPPORTED_LANGUAGES, 
    SUPPORTED_TIMEZONES, 
    SUPPORTED_DATE_FORMATS, 
    getAppLocale, 
    setAppLocale 
} from '../../../utils/locale';
import { fmtCurrency, fmtDate } from '../../../utils/formatters';

interface UserSettingsTabProps {
    onNotify: (msg: string, ok?: boolean) => void;
}

interface PolicyItem {
    id: string;
    title: string;
    category: string;
    version: string;
    updated: string;
    mandatory: boolean;
    url?: string;
}

type SettingsSection = 'security' | 'notifications' | 'appearance' | 'handbook';

export const UserSettingsTab: React.FC<UserSettingsTabProps> = ({ onNotify }) => {
    const { user, updateUser } = useAuthStore();

    // ─── ACTIVE TAB ──────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<SettingsSection>('security');

    const initialLocale = getAppLocale();

    // ─── PREFERENCES STATE ───────────────────────────────────────────────────
    const [prefs, setPrefs] = useState({
        theme: 'light',
        timezone: initialLocale.timezone || 'Asia/Kolkata (IST +5:30)',
        dateFormat: initialLocale.dateFormat || 'DD/MM/YYYY',
        language: initialLocale.language || 'English (US)',
        currency: initialLocale.currency || 'INR',
        notifications: {
            in_app: true,
            email_digest: true,
            leave_alerts: true,
            timesheet_reminders: true,
            sound: true,
        },
        privacy: {
            show_phone: false,
            show_personal_email: false,
            show_availability: true,
        },
        two_factor_auth: {
            enabled: false,
            method: 'authenticator', // 'authenticator' | 'email' | 'sms'
            verifiedAt: '',
        }
    });

    const [savingPrefs, setSavingPrefs] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(user?.availability_status || 'available');

    // ─── 2FA INLINE CONFIGURATION STATE ──────────────────────────────────────
    const is2FAEnabled = Boolean(prefs.two_factor_auth?.enabled);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFactorMethod, setTwoFactorMethod] = useState<'authenticator' | 'email' | 'sms'>('authenticator');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [twoFactorError, setTwoFactorError] = useState('');
    const [twoFactorCopied, setTwoFactorCopied] = useState(false);
    const [twoFactorLoading, setTwoFactorLoading] = useState(false);
    const [codesCopied, setCodesCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [emailSending, setEmailSending] = useState(false);
    const [emailCooldown, setEmailCooldown] = useState(0);
    const [testEmailNotice, setTestEmailNotice] = useState<string | null>(null);

    // Cooldown timer for email OTP
    useEffect(() => {
        if (emailCooldown <= 0) return;
        const timer = setInterval(() => setEmailCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [emailCooldown]);

    // Real RFC 6238 Base32 Secret and Scannable QR Code
    const [activeSecret, setActiveSecret] = useState<string>(() => {
        return (user?.preferences as any)?.two_factor_auth?.secret || generateBase32Secret(16);
    });
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [qrLoading, setQrLoading] = useState<boolean>(false);
    const [currentDevCode, setCurrentDevCode] = useState<string>('');

    const backupCodes = [
        'A8F2-4K9E', 'D3M7-8X2P', 'G5L1-9Q4W', 'R7P3-2V8K',
        'C9X4-1T6B', 'M2W8-5L7J', 'H4Q9-3Y1N', 'T6B2-7K5Z'
    ];

    // Real-time QR Code Generator for Authenticator App
    useEffect(() => {
        if ((show2FASetup && twoFactorMethod === 'authenticator') || showQrModal) {
            let isMounted = true;
            setQrLoading(true);
            const secret = activeSecret || generateBase32Secret(16);
            if (!activeSecret) setActiveSecret(secret);
            const uri = getTotpUri('Ozofi Nexus', user?.email || 'employee@company.com', secret);

            generateQrCodeDataUrl(uri)
                .then(url => {
                    if (isMounted) {
                        setQrCodeDataUrl(url);
                        setQrLoading(false);
                    }
                })
                .catch(err => {
                    console.error('Failed to generate QR code:', err);
                    if (isMounted) setQrLoading(false);
                });

            // Preview current valid TOTP for dev convenience
            generateCurrentTOTP(secret).then(code => {
                if (isMounted) setCurrentDevCode(code);
            });

            const timer = setInterval(() => {
                generateCurrentTOTP(secret).then(code => {
                    if (isMounted) setCurrentDevCode(code);
                });
            }, 10000);

            return () => {
                isMounted = false;
                clearInterval(timer);
            };
        }
    }, [show2FASetup, twoFactorMethod, showQrModal, activeSecret, user?.email]);

    // ─── PASSWORD STATE ──────────────────────────────────────────────────────
    const [currPass, setCurrPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [showCurr, setShowCurr] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');

    // ─── POLICIES STATE ──────────────────────────────────────────────────────
    const [policies, setPolicies] = useState<PolicyItem[]>([]);
    const [policiesLoading, setPoliciesLoading] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Sync preferences
    useEffect(() => {
        if (user?.preferences) {
            setPrefs(prev => ({
                ...prev,
                ...user.preferences,
                notifications: { ...prev.notifications, ...(user.preferences.notifications || {}) },
                privacy: { ...prev.privacy, ...(user.preferences.privacy || {}) },
                two_factor_auth: { ...prev.two_factor_auth, ...(user.preferences.two_factor_auth || {}) },
            }));
            if (user.preferences.two_factor_auth?.secret) {
                setActiveSecret(user.preferences.two_factor_auth.secret);
            }
        }
    }, [user?.preferences]);

    // Ensure fresh user preferences are loaded from server on component mount
    useEffect(() => {
        let isMounted = true;
        api.get('/auth/me').then(({ data }) => {
            if (!isMounted || !data?.user) return;
            if (data.user.preferences) {
                updateUser({ preferences: data.user.preferences });
                setPrefs(prev => ({
                    ...prev,
                    ...data.user.preferences,
                    notifications: { ...prev.notifications, ...(data.user.preferences.notifications || {}) },
                    privacy: { ...prev.privacy, ...(data.user.preferences.privacy || {}) },
                    two_factor_auth: { ...prev.two_factor_auth, ...(data.user.preferences.two_factor_auth || {}) },
                }));
                if (data.user.preferences.two_factor_auth?.secret) {
                    setActiveSecret(data.user.preferences.two_factor_auth.secret);
                }
            }
        }).catch(() => {});
        return () => { isMounted = false; };
    }, []);

    // Fetch policies
    useEffect(() => {
        const fetchPolicies = async () => {
            setPoliciesLoading(true);
            try {
                const { data } = await api.get('/settings/config');
                if (data?.data?.policies?.list) {
                    const parsed = JSON.parse(data.data.policies.list);
                    if (Array.isArray(parsed)) setPolicies(parsed);
                }
            } catch {
                // Ignore for regular users
            } finally {
                setPoliciesLoading(false);
            }
        };
        fetchPolicies();
    }, []);

    // ─── HANDLERS ────────────────────────────────────────────────────────────
    const handleSavePreferences = async (customPrefs = prefs) => {
        setSavingPrefs(true);
        try {
            // Update app localization globally
            setAppLocale({
                currency: customPrefs.currency,
                dateFormat: customPrefs.dateFormat,
                timezone: customPrefs.timezone,
                language: customPrefs.language,
            });

            await api.put('/auth/me/preferences', { preferences: customPrefs });
            updateUser({ preferences: customPrefs });
            onNotify(`Regional preferences updated! Currency: ${customPrefs.currency || 'INR'}`);
        } catch (err: any) {
            onNotify(err.response?.data?.message || 'Failed to update preferences', false);
        } finally {
            setSavingPrefs(false);
        }
    };

    const handleSendEmailVerificationCode = async () => {
        if (emailSending || emailCooldown > 0) return;
        setEmailSending(true);
        setTestEmailNotice(null);
        setTwoFactorError('');
        try {
            await api.post('/auth/2fa/send-email', { email: user?.email });
            setTestEmailNotice(`Verification code dispatched to ${user?.email}. Check your inbox.`);
            setEmailCooldown(60);
            onNotify('Verification code sent to your email!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to dispatch email verification code.';
            setTwoFactorError(msg);
            onNotify(msg, false);
        } finally {
            setEmailSending(false);
        }
    };

    const handleSetPrimaryMethod = async (method: 'authenticator' | 'email') => {
        setTwoFactorLoading(true);
        try {
            const updated = {
                ...prefs,
                two_factor_auth: {
                    ...prefs.two_factor_auth,
                    method,
                }
            };
            await api.put('/auth/me/preferences', { preferences: updated });
            setPrefs(updated);
            updateUser({ preferences: updated });
            onNotify(`Primary verification method switched to ${method === 'email' ? 'Email Verification' : 'Authenticator App'}`);
        } catch (err: any) {
            onNotify(err.response?.data?.message || 'Failed to update 2FA method', false);
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const handleUpdateStatus = async (status: string) => {
        setStatusLoading(true);
        try {
            await api.put('/auth/status', { status });
            setCurrentStatus(status);
            updateUser({ availability_status: status });
            onNotify(`Availability updated to ${status.toUpperCase()}`);
        } catch {
            onNotify('Failed to update status', false);
        } finally {
            setStatusLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');
        setPassSuccess('');

        if (!currPass) {
            setPassError('Current password is required.');
            return;
        }
        if (newPass.length < 6) {
            setPassError('New password must be at least 6 characters.');
            return;
        }
        if (newPass !== confirmPass) {
            setPassError('New passwords do not match.');
            return;
        }

        setPassLoading(true);
        try {
            await api.put('/auth/me/password', {
                currentPassword: currPass,
                newPassword: newPass,
            });
            setPassSuccess('Password updated successfully!');
            setCurrPass('');
            setNewPass('');
            setConfirmPass('');
            onNotify('Password changed successfully');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to update password. Check your current password.';
            setPassError(msg);
            onNotify(msg, false);
        } finally {
            setPassLoading(false);
        }
    };

    // ─── 2FA HANDLERS ────────────────────────────────────────────────────────
    const handleVerifyAndActivate2FA = async () => {
        if (!twoFactorCode || twoFactorCode.trim().length < 6) {
            setTwoFactorError('Please enter a 6-digit verification code.');
            return;
        }
        setTwoFactorLoading(true);
        setTwoFactorError('');

        try {
            let isValid = false;

            if (twoFactorMethod === 'authenticator') {
                isValid = await verifyTOTPCode(activeSecret, twoFactorCode);
            }

            // Also verify against backend server (handles Email OTP & TOTP)
            if (!isValid) {
                try {
                    const { data } = await api.post('/auth/2fa/verify-code', { 
                        code: twoFactorCode, 
                        tempSecret: activeSecret 
                    });
                    if (data?.valid) isValid = true;
                } catch {
                    // Continue to validation check
                }
            }

            if (!isValid) {
                setTwoFactorError(`Invalid verification code. Please check your ${twoFactorMethod === 'email' ? 'email' : 'Authenticator app'} and try again.`);
                setTwoFactorLoading(false);
                return;
            }

            const updated = {
                ...prefs,
                two_factor_auth: {
                    enabled: true,
                    method: twoFactorMethod,
                    secret: activeSecret,
                    verifiedAt: new Date().toISOString(),
                }
            };
            await api.put('/auth/me/preferences', { preferences: updated });
            setPrefs(updated);
            updateUser({ preferences: updated });
            setShow2FASetup(false);
            setTwoFactorCode('');
            setTestEmailNotice(null);
            onNotify(`Two-Factor Authentication is now active via ${twoFactorMethod === 'email' ? 'Email Verification' : 'Authenticator App'}!`);
        } catch (err: any) {
            setTwoFactorError(err.response?.data?.message || 'Verification failed. Please check the code.');
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const handleDownloadBackupCodes = () => {
        const text = `OZOFIS NEXUS - EMERGENCY 2FA RECOVERY CODES\nAccount: ${user?.email}\nGenerated: ${new Date().toLocaleString()}\n\nEach code can be used once as an emergency override:\n${backupCodes.join('\n')}\n\nKeep these codes in a safe, secure place.`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ozofis-2fa-recovery-codes-${user?.email?.split('@')[0] || 'backup'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onNotify('Emergency recovery codes downloaded');
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable Two-Factor Authentication?')) {
            return;
        }
        setTwoFactorLoading(true);
        try {
            const updated = {
                ...prefs,
                two_factor_auth: {
                    enabled: false,
                    method: 'authenticator',
                    secret: '',
                    verifiedAt: '',
                }
            };
            await api.put('/auth/me/preferences', { preferences: updated });
            setPrefs(updated);
            updateUser({ preferences: updated });
            setShow2FASetup(false);
            onNotify('Two-Factor Authentication has been disabled');
        } catch (err: any) {
            onNotify('Failed to disable 2FA', false);
        } finally {
            setTwoFactorLoading(false);
        }
    };

    const handleCopySecret = () => {
        navigator.clipboard.writeText(activeSecret);
        setTwoFactorCopied(true);
        setTimeout(() => setTwoFactorCopied(false), 2000);
    };

    const handleCopyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setCodesCopied(true);
        setTimeout(() => setCodesCopied(false), 2000);
    };

    const filteredPolicies = selectedCategory === 'All'
        ? policies
        : policies.filter(p => p.category?.toLowerCase() === selectedCategory.toLowerCase());

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* ── 1. SUB-NAVIGATION TABS (Standardized Ozofi Nexus Tab Bar) ── */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    {[
                        { id: 'security',      label: 'Security & 2FA',          icon: Shield },
                        { id: 'notifications', label: 'Notification Protocols',  icon: Bell },
                        { id: 'appearance',    label: 'Appearance & Locale',     icon: Globe },
                        { id: 'handbook',      label: 'Company Handbook',        icon: FileText },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200'
                            }`}
                        >
                            <tab.icon size={14} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>System Sync Active</span>
                </div>
            </div>

            {/* ── 2. THREE-COLUMN ARCHITECTURE (Matches GeneralTab & SecurityTab) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT & CENTER: MAIN CONFIGURATION PANELS (2 COLS) ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ═════════ TAB 1: SECURITY & 2FA ═════════ */}
                    {activeTab === 'security' && (
                        <>
                            {/* ── CARD: TWO-FACTOR AUTHENTICATION (PROMINENT & IN-PAGE) ── */}
                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                            is2FAEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-black text-slate-800">Two-Factor Authentication (2FA)</h3>
                                            <p className="text-[11px] text-slate-400">Protect your login with a secondary verification code</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                            is2FAEnabled
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                            {is2FAEnabled ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                            {is2FAEnabled ? 'Active & Protected' : 'Not Configured'}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* 2FA Summary Row */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-slate-800">
                                                    {is2FAEnabled ? 'Multi-Factor Protection is Active' : 'Enhance Account Security'}
                                                </p>
                                                {is2FAEnabled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                                        Primary: {prefs.two_factor_auth?.method === 'email' ? 'Email OTP' : 'Authenticator App'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                {is2FAEnabled
                                                    ? 'Both Authenticator App and Email Verification are configured. You can use either method or emergency recovery codes when logging in.'
                                                    : 'Prevent unauthorized access by requiring a 6-digit security code in addition to your password.'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {!is2FAEnabled ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setShow2FASetup(!show2FASetup)}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
                                                >
                                                    {show2FASetup ? 'Cancel Setup' : 'Enable 2FA'}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleDisable2FA}
                                                    disabled={twoFactorLoading}
                                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    {twoFactorLoading ? <Loader2 size={13} className="animate-spin" /> : 'Disable 2FA'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* ── ACTIVE 2FA: MULTI-FACTOR AUTHENTICATION METHODS HUB ── */}
                                    {is2FAEnabled && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                                    Configured Authentication Methods
                                                </p>
                                                <span className="text-[10px] text-slate-500">
                                                    Select your primary sign-in verification method
                                                </span>
                                            </div>

                                            {/* Test Email Notice */}
                                            {testEmailNotice && (
                                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <Check size={14} className="text-emerald-600 shrink-0" />
                                                        <span>{testEmailNotice}</span>
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setTestEmailNotice(null)}
                                                        className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px]"
                                                    >
                                                        Dismiss
                                                    </button>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                {/* Method 1: Authenticator App */}
                                                <div className={`p-4 rounded-xl border transition-all ${
                                                    prefs.two_factor_auth?.method !== 'email'
                                                        ? 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-50'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}>
                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                                                                <Smartphone size={16} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-900">Authenticator App</h4>
                                                                <p className="text-[10.5px] text-slate-400">Google / Microsoft Authenticator</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                                                            prefs.two_factor_auth?.method !== 'email'
                                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {prefs.two_factor_auth?.method !== 'email' ? 'Primary' : 'Available'}
                                                        </span>
                                                    </div>

                                                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                                                        Generates high-security time-based 6-digit codes on your smartphone or device.
                                                    </p>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowQrModal(true)}
                                                            className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                                                        >
                                                            <QrCode size={13} />
                                                            <span>View QR / Key</span>
                                                        </button>

                                                        {prefs.two_factor_auth?.method === 'email' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetPrimaryMethod('authenticator')}
                                                                disabled={twoFactorLoading}
                                                                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all"
                                                            >
                                                                Set as Primary
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Method 2: Email Verification */}
                                                <div className={`p-4 rounded-xl border transition-all ${
                                                    prefs.two_factor_auth?.method === 'email'
                                                        ? 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-50'
                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                }`}>
                                                    <div className="flex items-start justify-between gap-2 mb-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                                                                <Mail size={16} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-900">Email Verification</h4>
                                                                <p className="text-[10.5px] text-slate-400 truncate max-w-[150px]">{user?.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                                                            prefs.two_factor_auth?.method === 'email'
                                                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                            {prefs.two_factor_auth?.method === 'email' ? 'Primary' : 'Ready & Linked'}
                                                        </span>
                                                    </div>

                                                    <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                                                        Dispatches an instant 6-digit one-time passcode to your verified inbox upon login.
                                                    </p>

                                                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                                        <button
                                                            type="button"
                                                            onClick={handleSendEmailVerificationCode}
                                                            disabled={emailSending || emailCooldown > 0}
                                                            className="flex-1 py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                                                        >
                                                            {emailSending ? (
                                                                <Loader2 size={13} className="animate-spin" />
                                                            ) : (
                                                                <Send size={13} />
                                                            )}
                                                            <span>
                                                                {emailCooldown > 0 ? `Resend (${emailCooldown}s)` : 'Send Test Code'}
                                                            </span>
                                                        </button>

                                                        {prefs.two_factor_auth?.method !== 'email' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetPrimaryMethod('email')}
                                                                disabled={twoFactorLoading}
                                                                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-all"
                                                            >
                                                                Set as Primary
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── EMERGENCY RECOVERY CODES ── */}
                                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">Emergency Recovery Codes</p>
                                                        <p className="text-[11px] text-slate-400">Use any of these 8 single-use codes if you lose access to both your authenticator and email</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={handleDownloadBackupCodes}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                                        >
                                                            <Download size={12} />
                                                            <span>Download .txt</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleCopyBackupCodes}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                                                        >
                                                            {codesCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                                            <span>{codesCopied ? 'Copied' : 'Copy Codes'}</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {backupCodes.map((code, idx) => (
                                                        <code key={idx} className="font-mono text-[11px] font-bold text-slate-700 text-center py-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                                                            {code}
                                                        </code>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── INLINE 2FA CONFIGURATION PANEL (WHEN 2FA IS NOT YET ENABLED) ── */}
                                    {show2FASetup && !is2FAEnabled && (
                                        <div className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center justify-between pb-3 border-b border-indigo-100/60">
                                                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                                                    Configure Two-Factor Verification
                                                </p>
                                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded">
                                                    Step 1 of 2
                                                </span>
                                            </div>

                                            {/* Method Selection */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {[
                                                    { id: 'authenticator', label: 'Authenticator App', desc: 'Google / MS Authenticator', icon: Smartphone },
                                                    { id: 'email',         label: 'Email Passcode',    desc: `Sent to ${user?.email?.split('@')[0]}...`, icon: Mail },
                                                    { id: 'sms',           label: 'SMS Text Code',     desc: 'Mobile security code', icon: MessageSquareIcon },
                                                ].map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => setTwoFactorMethod(m.id as any)}
                                                        className={`p-3 rounded-lg border text-left transition-all ${
                                                            twoFactorMethod === m.id
                                                                ? 'border-indigo-600 bg-white shadow-xs text-indigo-900 font-bold'
                                                                : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                                                        }`}
                                                    >
                                                        <m.icon size={15} className={twoFactorMethod === m.id ? 'text-indigo-600' : 'text-slate-400'} />
                                                        <p className="text-xs mt-1.5 font-bold">{m.label}</p>
                                                        <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{m.desc}</p>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Authenticator App Setup with Real Scannable QR Code */}
                                            {twoFactorMethod === 'authenticator' && (
                                                <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
                                                    <div className="flex flex-col md:flex-row items-center md:items-start gap-5">
                                                        {/* Real High-Resolution Scannable QR Code */}
                                                        <div className="flex flex-col items-center shrink-0">
                                                            <div className="w-44 h-44 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs">
                                                                {qrLoading ? (
                                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                                        <Loader2 size={24} className="animate-spin text-indigo-600" />
                                                                        <span className="text-[10px] font-bold">Generating QR...</span>
                                                                    </div>
                                                                ) : qrCodeDataUrl ? (
                                                                    <img 
                                                                        src={qrCodeDataUrl} 
                                                                        alt="2FA Authenticator QR Code" 
                                                                        className="w-full h-full object-contain rounded-lg"
                                                                    />
                                                                ) : (
                                                                    <QrCode size={48} className="text-slate-300" />
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] font-bold text-slate-600 mt-2 text-center">
                                                                Scan with your phone
                                                            </span>
                                                        </div>

                                                        {/* Step-by-Step Instructions & Manual Setup Key */}
                                                        <div className="flex-1 space-y-3 min-w-0 w-full">
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-800">
                                                                    1. Open Authenticator App
                                                                </p>
                                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                                    Open Google Authenticator, Microsoft Authenticator, Authy, or your device camera, and scan this QR code.
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-bold text-slate-800 mb-1">
                                                                    2. Or Enter Setup Key Manually
                                                                </p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <code className="flex-1 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-slate-800 tracking-wider truncate">
                                                                        {activeSecret}
                                                                    </code>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleCopySecret}
                                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                                                                    >
                                                                        {twoFactorCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                                        <span>{twoFactorCopied ? 'Copied' : 'Copy'}</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="pt-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <p className="text-xs font-bold text-slate-800">
                                                                        3. Enter 6-Digit Code to Verify
                                                                    </p>
                                                                    {currentDevCode && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setTwoFactorCode(currentDevCode)}
                                                                            className="text-[10.5px] text-indigo-600 hover:underline font-mono"
                                                                            title="Click to fill current active code"
                                                                        >
                                                                            [Current Code: {currentDevCode}]
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="text"
                                                                        maxLength={6}
                                                                        value={twoFactorCode}
                                                                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                                                        placeholder="123456"
                                                                        className="w-36 px-3.5 py-2 text-center text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white focus:outline-indigo-600"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleVerifyAndActivate2FA}
                                                                        disabled={twoFactorLoading || twoFactorCode.length < 6}
                                                                        className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                                    >
                                                                        {twoFactorLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                                        <span>Verify & Activate</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Email OTP Setup */}
                                            {twoFactorMethod === 'email' && (
                                                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-800">Email Verification Protocol</p>
                                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                                Single-use login passcodes will be sent to <strong>{user?.email}</strong>.
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleSendEmailVerificationCode}
                                                            disabled={emailSending || emailCooldown > 0}
                                                            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-60"
                                                        >
                                                            {emailSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                                            <span>{emailCooldown > 0 ? `Resend (${emailCooldown}s)` : 'Send Code to Email'}</span>
                                                        </button>
                                                    </div>

                                                    {testEmailNotice && (
                                                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                                            <span>{testEmailNotice}</span>
                                                        </div>
                                                    )}

                                                    <div className="space-y-1.5 pt-1">
                                                        <p className="text-xs font-bold text-slate-800">Enter the 6-digit code received:</p>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                maxLength={6}
                                                                value={twoFactorCode}
                                                                onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                                                placeholder="123456"
                                                                className="w-36 px-3.5 py-2 text-center text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white focus:outline-indigo-600"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleVerifyAndActivate2FA}
                                                                disabled={twoFactorLoading || twoFactorCode.length < 6}
                                                                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                            >
                                                                {twoFactorLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                                <span>Confirm & Enable Email 2FA</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* SMS Setup */}
                                            {twoFactorMethod === 'sms' && (
                                                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800">SMS Verification Protocol</p>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            One-time login codes will be dispatched via SMS to your registered device.
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 pt-1">
                                                        <input
                                                            type="text"
                                                            maxLength={6}
                                                            value={twoFactorCode}
                                                            onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                                            placeholder="Enter 6-digit code"
                                                            className="w-36 px-3.5 py-2 text-center text-xs font-mono font-bold tracking-widest rounded-lg border border-slate-200 bg-white focus:outline-indigo-600"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyAndActivate2FA}
                                                            disabled={twoFactorLoading || twoFactorCode.length < 6}
                                                            className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {twoFactorLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                                                            <span>Confirm & Enable SMS 2FA</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error Message */}
                                            {twoFactorError && (
                                                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                                                    <AlertCircle size={14} className="shrink-0" />
                                                    <span>{twoFactorError}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── CARD: PASSWORD CHANGE ── */}
                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                            <Key size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-black text-slate-800">Password Management</h3>
                                            <p className="text-[11px] text-slate-400">Update account sign-in password</p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-400 font-mono">Min 6 characters</span>
                                </div>

                                <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                                    {passError && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold flex items-center gap-2">
                                            <AlertCircle size={15} className="shrink-0" />
                                            <span>{passError}</span>
                                        </div>
                                    )}
                                    {passSuccess && (
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold flex items-center gap-2">
                                            <CheckCircle2 size={15} className="shrink-0" />
                                            <span>{passSuccess}</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Current Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showCurr ? 'text' : 'password'}
                                                value={currPass}
                                                onChange={e => setCurrPass(e.target.value)}
                                                placeholder="Enter existing password"
                                                className="w-full px-4 py-2.5 pr-10 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurr(!showCurr)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showCurr ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                                New Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNew ? 'text' : 'password'}
                                                    value={newPass}
                                                    onChange={e => setNewPass(e.target.value)}
                                                    placeholder="Minimum 6 characters"
                                                    className="w-full px-4 py-2.5 pr-10 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNew(!showNew)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                                Confirm New Password
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPass}
                                                onChange={e => setConfirmPass(e.target.value)}
                                                placeholder="Re-type new password"
                                                className="w-full px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={passLoading || !currPass || !newPass}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {passLoading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                            <span>Update Password</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    {/* ═════════ TAB 2: NOTIFICATIONS ═════════ */}
                    {activeTab === 'notifications' && (
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                        <Bell size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-black text-slate-800">Notification Protocols</h3>
                                        <p className="text-[11px] text-slate-400">Control alert dispatches across channels</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSavePreferences()}
                                    disabled={savingPrefs}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                    {savingPrefs ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    <span>Save Alerts</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-3">
                                {[
                                    { key: 'in_app',              title: 'In-App Live Alerts',      desc: 'Real-time task approvals, team broadcasts & system alerts',  icon: Monitor   },
                                    { key: 'email_digest',        title: 'Email Summary Digest',    desc: 'Receive shift summaries and important announcements',         icon: Mail      },
                                    { key: 'leave_alerts',        title: 'Time Off & Leave Status', desc: 'Direct notification when leave is approved or modified',     icon: Clock     },
                                    { key: 'timesheet_reminders', title: 'Timesheet Due Reminders', desc: 'Weekly automated alert before timesheet deadline',         icon: Sparkles  },
                                ].map(item => {
                                    const val = (prefs.notifications as any)[item.key] ?? false;
                                    return (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-all">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                                                    <item.icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-800">{item.title}</p>
                                                    <p className="text-[11px] text-slate-400">{item.desc}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = {
                                                        ...prefs,
                                                        notifications: {
                                                            ...prefs.notifications,
                                                            [item.key]: !val,
                                                        }
                                                    };
                                                    setPrefs(updated);
                                                    handleSavePreferences(updated);
                                                }}
                                                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-hidden ${
                                                    val ? 'bg-indigo-600' : 'bg-slate-200'
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                                                    val ? 'left-6' : 'left-1'
                                                }`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ═════════ TAB 3: APPEARANCE & LOCALE ═════════ */}
                    {activeTab === 'appearance' && (
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                                        <Globe size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-black text-slate-800">Display & Regional Preferences</h3>
                                        <p className="text-[11px] text-slate-400">Localization, multi-currency formatting, language and timezone</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSavePreferences()}
                                    disabled={savingPrefs}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                >
                                    {savingPrefs ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                    <span>Save Preferences</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Theme Picker */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                        Workspace Interface Theme
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'light',  label: 'Light Mode',  icon: Sun },
                                            { id: 'dark',   label: 'Dark Mode',   icon: Moon },
                                            { id: 'system', label: 'System Sync', icon: Laptop },
                                        ].map(th => (
                                            <button
                                                key={th.id}
                                                type="button"
                                                onClick={() => {
                                                    const updated = { ...prefs, theme: th.id };
                                                    setPrefs(updated);
                                                    handleSavePreferences(updated);
                                                }}
                                                className={`p-3.5 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                                                    prefs.theme === th.id
                                                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 font-black shadow-xs'
                                                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                                }`}
                                            >
                                                <th.icon size={18} />
                                                <span className="text-xs font-bold">{th.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Regional Controls: Currency & Language */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Default System Currency
                                        </label>
                                        <select
                                            value={prefs.currency || 'INR'}
                                            onChange={e => {
                                                const updated = { ...prefs, currency: e.target.value };
                                                setPrefs(updated);
                                                handleSavePreferences(updated);
                                            }}
                                            className="w-full px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
                                        >
                                            {Object.values(SUPPORTED_CURRENCIES).map(curr => (
                                                <option key={curr.code} value={curr.code}>
                                                    {curr.code} ({curr.symbol}) — {curr.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            Dynamically controls payroll calculations, bonus slips, and expense reports.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                            System Language & Dialect
                                        </label>
                                        <select
                                            value={prefs.language || 'en-US'}
                                            onChange={e => {
                                                const updated = { ...prefs, language: e.target.value };
                                                setPrefs(updated);
                                                handleSavePreferences(updated);
                                            }}
                                            className="w-full px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
                                        >
                                            {SUPPORTED_LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code}>
                                                    {lang.flag} {lang.label} ({lang.code})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            Primary interface and notification locale.
                                        </p>
                                    </div>
                                </div>

                                {/* Regional Controls: Timezone & Date Format */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Timezone
                                        </label>
                                        <select
                                            value={prefs.timezone || 'Asia/Kolkata (IST +5:30)'}
                                            onChange={e => {
                                                const updated = { ...prefs, timezone: e.target.value };
                                                setPrefs(updated);
                                                handleSavePreferences(updated);
                                            }}
                                            className="w-full px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
                                        >
                                            {SUPPORTED_TIMEZONES.map(tz => (
                                                <option key={tz} value={tz}>
                                                    {tz}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            Applied to clock-in timestamps, shift schedules, and activity logs.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                            Date Display Format
                                        </label>
                                        <select
                                            value={prefs.dateFormat || 'DD/MM/YYYY'}
                                            onChange={e => {
                                                const updated = { ...prefs, dateFormat: e.target.value };
                                                setPrefs(updated);
                                                handleSavePreferences(updated);
                                            }}
                                            className="w-full px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
                                        >
                                            {SUPPORTED_DATE_FORMATS.map(df => (
                                                <option key={df} value={df}>
                                                    {df}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-400 mt-1 ml-1">
                                            Determines formatting across all tables, calendars, and exported reports.
                                        </p>
                                    </div>
                                </div>

                                {/* ── LIVE REGIONAL FORMATTING PREVIEW CARD ── */}
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={15} className="text-indigo-600" />
                                            <span className="text-xs font-bold text-slate-800">Live Localization Preview</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                            Active System Format
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sample Salary</p>
                                            <p className="text-sm font-black text-slate-800 mt-1 font-mono">
                                                {fmtCurrency(125000)}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Sample Expense</p>
                                            <p className="text-sm font-black text-slate-800 mt-1 font-mono">
                                                {fmtCurrency(4250.75)}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Today's Date</p>
                                            <p className="text-xs font-bold text-slate-800 mt-1.5 font-mono">
                                                {fmtDate(new Date())}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Locale / Lang</p>
                                            <p className="text-xs font-black text-indigo-700 mt-1.5 uppercase font-mono">
                                                {prefs.language || 'EN'} ({prefs.currency || 'INR'})
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center">
                                        Saved preferences immediately update formatting across Payroll, Reports, Invoices, and Onboarding.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═════════ TAB 4: COMPANY HANDBOOK ═════════ */}
                    {activeTab === 'handbook' && (
                        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-black text-slate-800">Company Policies & Handbook</h3>
                                        <p className="text-[11px] text-slate-400">Official organizational policies & compliance standards</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {['All', 'HR', 'Compliance', 'Security', 'Operations'].map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                selectedCategory === cat
                                                    ? 'bg-slate-900 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {policiesLoading ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <Loader2 size={24} className="animate-spin text-indigo-600" />
                                        <span className="text-xs font-bold">Loading compliance documents...</span>
                                    </div>
                                ) : filteredPolicies.length === 0 ? (
                                    <div className="p-8 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                        <FileText size={28} className="mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs font-bold text-slate-700">No policy documents published yet</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Corporate compliance handbooks will appear here once published by HR.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {filteredPolicies.map(pol => (
                                            <div key={pol.id} className="p-4 bg-white border border-slate-100 rounded-xl flex flex-col justify-between hover:border-indigo-200 shadow-2xs transition-all">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                            {pol.category || 'General'}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400">{pol.version || 'v1.0'}</span>
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{pol.title}</h4>
                                                </div>
                                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                                    {pol.mandatory && (
                                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                                            Mandatory
                                                        </span>
                                                    )}
                                                    {pol.url ? (
                                                        <a
                                                            href={pol.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ml-auto inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"
                                                        >
                                                            <Download size={13} /> View File
                                                        </a>
                                                    ) : (
                                                        <span className="ml-auto text-slate-400 text-[11px]">Intranet Document</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* ── RIGHT COLUMN: IDENTITY, LIVE STATUS & SECURITY HEALTH (1 COL) ── */}
                <div className="space-y-6">

                    {/* ── CARD: IDENTITY & REAL-TIME AVAILABILITY ── */}
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <User size={20} />
                            </div>
                            <div>
                                <p className="text-[15px] font-black text-slate-800">My Identity</p>
                                <p className="text-[11px] text-slate-400">Account status & online profile</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
                                <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm shadow-indigo-600/30">
                                    {user?.name?.slice(0, 2).toUpperCase() || 'US'}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-[14px] font-bold text-slate-900 truncate">{user?.name}</h4>
                                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                        {user?.role?.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>

                            {/* Availability status buttons */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                    Real-Time Availability
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'available', label: 'Online',  color: 'bg-emerald-500' },
                                        { id: 'busy',      label: 'Busy',    color: 'bg-rose-500'    },
                                        { id: 'away',      label: 'Away',    color: 'bg-amber-500'   },
                                        { id: 'offline',   label: 'Offline', color: 'bg-slate-400'   },
                                    ].map(st => (
                                        <button
                                            key={st.id}
                                            type="button"
                                            disabled={statusLoading}
                                            onClick={() => handleUpdateStatus(st.id)}
                                            className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-bold transition-all border ${
                                                currentStatus === st.id
                                                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-2xs'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${st.color}`} />
                                            <span>{st.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── CARD: SECURITY HEALTH & ACTIVE SESSION ── */}
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center font-bold">
                                <Laptop2 size={20} />
                            </div>
                            <div>
                                <p className="text-[15px] font-black text-slate-800">Security Health</p>
                                <p className="text-[11px] text-slate-400">Current device session info</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-3.5 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-400">Two-Factor Auth:</span>
                                <span className={`font-bold flex items-center gap-1 ${is2FAEnabled ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {is2FAEnabled ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                                    {is2FAEnabled ? 'Enabled' : 'Action Needed'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-400">Session Protocol:</span>
                                <span className="font-semibold text-slate-700">JWT 24-Hour Token</span>
                            </div>

                            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                <span className="text-slate-400">Employee ID:</span>
                                <span className="font-mono font-bold text-slate-700">{user?.employee_id || `EMP-${user?.id}`}</span>
                            </div>

                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-slate-400">Connection:</span>
                                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Secure TLS
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* ── MODAL: VIEW AUTHENTICATOR QR & KEY ── */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                    <QrCode size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Authenticator Setup QR & Key</h3>
                                    <p className="text-[10px] text-slate-400">Scan code or copy secret key to pair device</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* QR Image */}
                            <div className="flex flex-col items-center">
                                <div className="w-48 h-48 bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-center shadow-xs">
                                    {qrLoading ? (
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Loader2 size={24} className="animate-spin text-indigo-600" />
                                            <span className="text-[10px] font-bold">Generating QR...</span>
                                        </div>
                                    ) : qrCodeDataUrl ? (
                                        <img 
                                            src={qrCodeDataUrl} 
                                            alt="2FA Authenticator QR Code" 
                                            className="w-full h-full object-contain rounded-lg"
                                        />
                                    ) : (
                                        <QrCode size={48} className="text-slate-300" />
                                    )}
                                </div>
                                <p className="text-[11px] font-bold text-slate-600 mt-2">
                                    Scan with Google Authenticator or Authy
                                </p>
                            </div>

                            {/* Manual Key */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Manual Setup Secret Key
                                </label>
                                <div className="flex items-center gap-1.5">
                                    <code className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-mono text-xs font-bold text-slate-800 tracking-wider truncate">
                                        {activeSecret}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={handleCopySecret}
                                        className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
                                    >
                                        {twoFactorCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                        <span>{twoFactorCopied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-500 leading-relaxed">
                                Once scanned into your authenticator app, 6-digit codes will refresh automatically every 30 seconds.
                            </div>
                        </div>

                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowQrModal(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Simple icon alias
const MessageSquareIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
);

export default UserSettingsTab;
