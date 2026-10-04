import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, LogIn } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../services/api';
import { Alert, Button, FormField, PasswordInput, TextInput } from '../../../components/ui';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { AuthLayout } from '../components/AuthLayout';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { readResetTokenFromHash, clearResetTokenFromUrl } from '../utils/resetToken';

// Development-only shortcuts. `import.meta.env.DEV` is false in production
// builds, so Vite removes this list and the panel from the bundle entirely:
// demo credentials never reach a deployed login page.
const DEV_ACCOUNTS = import.meta.env.DEV
    ? [
          { label: 'Administrator', email: 'admin@company.com', password: 'Admin@123' },
          { label: 'HR manager', email: 'priya@company.com', password: 'Admin@123' },
          { label: 'Employee', email: 'alex.rivers@company.com', password: 'Admin@123' },
      ]
    : [];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage: React.FC = () => {
    usePageTitle('Sign in');

    const [email, setEmail] = useState(DEV_ACCOUNTS[0]?.email ?? '');
    const [password, setPassword] = useState(DEV_ACCOUNTS[0]?.password ?? '');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    // An emailed reset link opens the dialog on its "set a new password" step (HF-3).
    const [resetToken, setResetToken] = useState<string | null>(() => readResetTokenFromHash());

    useEffect(() => {
        if (resetToken) {
            clearResetTokenFromUrl();
            setShowForgotPassword(true);
        }
    }, [resetToken]);

    const { setAuth, isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated && user) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, user, navigate]);

    const validate = () => {
        const next: typeof fieldErrors = {};
        if (!email.trim()) next.email = 'Enter your email address.';
        else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.';
        if (!password) next.password = 'Enter your password.';
        setFieldErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validate()) return;
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', { email, password });
            const data = res.data;
            setAuth(
                {
                    id: data.user.id, employee_id: data.user.employee_id,
                    tenant_id: data.user.tenant_id, name: data.user.name,
                    email: data.user.email, role: data.user.role,
                    phone: data.user.phone, address: data.user.address,
                    emergency: data.user.emergency,
                    permissions: data.user.permissions || [],
                },
                data.accessToken || data.token,
                data.refreshToken,
                data.mustChangePassword
            );

            if (data.mustChangePassword) {
                navigate('/change-password', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                    "We couldn't sign you in. Check your email and password and try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    const applyDevAccount = (account: (typeof DEV_ACCOUNTS)[number]) => {
        setEmail(account.email);
        setPassword(account.password);
        setFieldErrors({});
        setError(null);
    };

    const devPanel = import.meta.env.DEV && DEV_ACCOUNTS.length > 0 && (
        <section aria-labelledby="dev-accounts-title" className="mt-6 rounded-xl border border-dashed border-nx-border-strong bg-nx-surface/60 p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 id="dev-accounts-title" className="text-xs font-medium text-nx-fg-muted">Development accounts</h2>
                <span className="text-[11px] text-nx-fg-subtle">Local builds only</span>
            </div>
            <ul className="space-y-1">
                {DEV_ACCOUNTS.map((account) => {
                    const selected = email === account.email;
                    return (
                        <li key={account.email}>
                            <button
                                type="button"
                                onClick={() => applyDevAccount(account)}
                                aria-pressed={selected}
                                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary ${
                                    selected ? 'bg-nx-primary-subtle text-nx-primary' : 'text-nx-fg hover:bg-nx-surface-muted'
                                }`}
                            >
                                <span className="font-medium">{account.label}</span>
                                <span className={`truncate text-xs ${selected ? 'text-nx-primary' : 'text-nx-fg-subtle'}`}>{account.email}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );

    return (
        <AuthLayout after={devPanel}>
            <div className="mb-6">
                <h1 className="font-nx text-xl font-semibold text-nx-fg">Sign in</h1>
                <p className="mt-1 text-sm text-nx-fg-muted">Use your work email and password.</p>
            </div>

            {error && (
                <Alert tone="danger" title="Sign-in failed" className="mb-5">
                    {error}
                </Alert>
            )}

            <form onSubmit={handleLogin} noValidate className="space-y-4">
                <FormField label="Email" error={fieldErrors.email}>
                    <TextInput
                        type="email"
                        name="email"
                        autoComplete="username"
                        inputMode="email"
                        autoFocus
                        leadingIcon={<Mail size={16} />}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                    />
                </FormField>

                <FormField
                    label="Password"
                    error={fieldErrors.password}
                    labelAside={
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm font-medium text-nx-primary hover:text-nx-primary-hover rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nx-primary"
                        >
                            Forgot password?
                        </button>
                    }
                >
                    <PasswordInput
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </FormField>

                <Button type="submit" size="lg" fullWidth loading={isLoading} icon={<LogIn size={16} aria-hidden />}>
                    {isLoading ? 'Signing in…' : 'Sign in'}
                </Button>
            </form>

            <p className="mt-6 text-xs leading-relaxed text-nx-fg-subtle">
                Accounts are created by your organization's administrator. If you can't sign in, contact them for help.
            </p>

            <ForgotPasswordModal
                isOpen={showForgotPassword}
                onClose={() => {
                    setShowForgotPassword(false);
                    setResetToken(null); // a link's token is single-use; never keep it after the dialog closes
                }}
                initialEmail={email}
                resetToken={resetToken}
            />
        </AuthLayout>
    );
};

export default LoginPage;
