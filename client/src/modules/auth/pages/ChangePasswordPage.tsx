import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../services/api';
import { Alert, Button, FormField, PasswordInput } from '../../../components/ui';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { AuthLayout } from '../components/AuthLayout';

const ChangePasswordPage: React.FC = () => {
    usePageTitle('Set your password');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const next: typeof fieldErrors = {};
        if (password.length < 8) next.password = 'Use at least 8 characters.';
        if (password !== confirm) next.confirm = 'Passwords do not match.';
        setFieldErrors(next);
        if (Object.keys(next).length) return;

        setLoading(true);
        try {
            await api.put('/auth/me/password', { newPassword: password, password });
            // The password is no longer temporary.
            useAuthStore.setState({ mustChangePassword: false });
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'We could not update your password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="mb-6">
                <h1 className="font-nx text-xl font-semibold text-nx-fg">Set your password</h1>
                <p className="mt-1 text-sm text-nx-fg-muted">
                    You signed in with a temporary password. Choose a new password to continue.
                </p>
                {user?.email && (
                    <p className="mt-3 inline-flex items-center rounded-md bg-nx-surface-muted px-2.5 py-1 text-xs text-nx-fg-muted">
                        {user.email}
                    </p>
                )}
            </div>

            {error && (
                <Alert tone="danger" title="Password not updated" className="mb-5">
                    {error}
                </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <FormField label="New password" hint="At least 8 characters." error={fieldErrors.password}>
                    <PasswordInput
                        name="new-password"
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </FormField>

                <FormField label="Confirm new password" error={fieldErrors.confirm}>
                    <PasswordInput
                        name="confirm-password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                    />
                </FormField>

                <Button type="submit" size="lg" fullWidth loading={loading}>
                    {loading ? 'Saving…' : 'Set password and continue'}
                </Button>
                <Button variant="ghost" fullWidth onClick={logout}>
                    Cancel and sign out
                </Button>
            </form>
        </AuthLayout>
    );
};

export default ChangePasswordPage;
