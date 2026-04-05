import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { LogIn, Lock, Mail, Loader2, Eye, EyeOff, Shield, Users, CreditCard, BarChart2 } from 'lucide-react';
import api from '../../../services/api';

// ============================================================================
// LOGIN PAGE — UPGRADED MULTI-ROLE SaaS LOGIN
// ============================================================================
// Changes:
//   1. Uses api service instead of raw fetch (for interceptors)
//   2. Stores permissions + refreshToken from upgraded auth response
//   3. Role-based redirect (admin→dashboard, employee→attendance)
//   4. Quick-switch buttons for demo roles
//   5. Error toast instead of alert()
//   6. Professional UI with role indicator
// ============================================================================

const DEMO_ACCOUNTS = [
    { label: 'Admin',    email: 'admin@example.com',   icon: Shield,     color: 'bg-blue-600' },
    { label: 'Manager',  email: 'sarah@example.com',   icon: Users,      color: 'bg-violet-600' },
    { label: 'Employee', email: 'michael@example.com', icon: CreditCard, color: 'bg-emerald-600' },
];

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('admin@example.com');
    const [password, setPassword] = useState('password');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { setAuth, isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = (location.state as any)?.from?.pathname;

    // If already authenticated, redirect
    useEffect(() => {
        if (isAuthenticated && user) {
            const target = getRedirectPath(user.role);
            navigate(target, { replace: true });
        }
    }, [isAuthenticated, user]);

    function getRedirectPath(role: string): string {
        if (from && from !== '/login') return from;
        return '/dashboard';
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setIsLoading(true);

        try {
            const res = await api.post('/auth/login', { email, password });
            const data = res.data;

            if (!data.success && !data.accessToken) {
                throw new Error(data.message || 'Login failed');
            }

            // Store user with permissions + tokens
            setAuth(
                {
                    id: data.user.id,
                    employee_id: data.user.employee_id,
                    tenant_id: data.user.tenant_id,
                    name: data.user.name,
                    email: data.user.email,
                    role: data.user.role,
                    phone: data.user.phone,
                    address: data.user.address,
                    emergency: data.user.emergency,
                    permissions: data.user.permissions || [],
                },
                data.accessToken || data.token,
                data.refreshToken
            );

            const target = getRedirectPath(data.user.role);
            navigate(target, { replace: true });
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectDemoAccount = (demoEmail: string) => {
        setEmail(demoEmail);
        setPassword('password');
        setError(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center p-4">
            <div className="max-w-[440px] w-full">

                {/* ── BRAND HEADER ──────────────────────────── */}
                <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-200/50 mb-5">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to PrecisionHub</h1>
                    <p className="text-slate-500 mt-1.5 text-sm">Sign in to your enterprise workspace</p>
                </div>

                {/* ── LOGIN CARD ─────────────────────────────── */}
                <div className="bg-white p-7 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100/80">

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 font-medium flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    placeholder="name@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                                <span className="text-xs text-slate-500">Remember me</span>
                            </label>
                            <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                                Forgot password?
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* ── DEMO ROLE SWITCHER ─────────────────────── */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Quick Login As</p>
                        <div className="grid grid-cols-3 gap-2">
                            {DEMO_ACCOUNTS.map((demo) => (
                                <button
                                    key={demo.label}
                                    type="button"
                                    onClick={() => selectDemoAccount(demo.email)}
                                    className={`
                                        group flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200
                                        ${email === demo.email
                                            ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <div className={`w-8 h-8 ${demo.color} rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                                        <demo.icon size={14} />
                                    </div>
                                    <span className={`text-[11px] font-semibold ${email === demo.email ? 'text-blue-700' : 'text-slate-500'}`}>
                                        {demo.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-6 text-[11px] text-slate-400">
                    &copy; 2026 PrecisionHub HRMS &middot; Enterprise SaaS Platform
                </p>
            </div>
        </div>
    );
};

export default LoginPage;