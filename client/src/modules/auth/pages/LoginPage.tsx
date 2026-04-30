import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { 
    LogIn, Lock, Mail, Loader2, Eye, EyeOff, Shield, 
    Users, UserCheck, AlertCircle, Zap, Globe, Cpu, Layers, ShieldAlert 
} from 'lucide-react';
import api from '../../../services/api';

const DEMO_ACCOUNTS = [
    { label: 'System Root', email: 'admin@company.com',   icon: Shield,    color: 'bg-indigo-600', password: 'admin123'  },
    { label: 'Executive', email: 'sarah@example.com',   icon: Users,     color: 'bg-purple-600', password: 'password'  },
    { label: 'Operator',  email: 'michael@example.com', icon: UserCheck, color: 'bg-emerald-600', password: 'password' },
];

const LoginPage: React.FC = () => {
    const [email, setEmail]               = useState('admin@company.com');
    const [password, setPassword]         = useState('admin123');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading]       = useState(false);
    const [error, setError]               = useState<string | null>(null);

    const { setAuth, isAuthenticated, user } = useAuthStore();
    const navigate  = useNavigate();

    useEffect(() => {
        if (isAuthenticated && user) navigate('/dashboard', { replace: true });
    }, [isAuthenticated, user, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) { setError('All protocols require valid credentials.'); return; }
        setIsLoading(true);
        try {
            const res  = await api.post('/auth/login', { email, password });
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
            setError(err.response?.data?.message || 'Authentication sequence failed. Verify credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const selectDemo = (account: typeof DEMO_ACCOUNTS[0]) => {
        setEmail(account.email);
        setPassword(account.password);
        setError(null);
    };

    return (
        <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-indigo-500/30">
            {/* Left: Brand Panel */}
            <div className="hidden lg:flex w-[480px] flex-col justify-between p-12 bg-[#0A0828] relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-full h-full opacity-20">
                    <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full border border-white/5" />
                    <div className="absolute bottom-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full border border-white/5" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                            <Layers size={26} className="text-white" />
                        </div>
                        <h1 className="text-[24px] font-black text-white tracking-tighter uppercase italic">AURA CORE</h1>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                            <Zap size={14} className="text-indigo-400 fill-indigo-400" />
                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Protocol Active</span>
                        </div>
                        <h2 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
                            ENTERPRISE<br />
                            <span className="text-indigo-400">COMMAND CENTER.</span>
                        </h2>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                            Access the neural interface for multi-tenant workforce management, automated fiscal processing, and real-time operational traceability.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                        <div>
                            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Sync Status</p>
                            <span className="text-[14px] font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                                Operational
                            </span>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Traceability</p>
                            <span className="text-[14px] font-bold text-white flex items-center gap-2">
                                <Shield size={14} className="text-indigo-400" />
                                L3 Secure
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Login Panel */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 bg-white relative">
                <div className="w-full max-w-md space-y-10">
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Identity Access</h3>
                        <p className="text-slate-400 font-bold text-[13px] uppercase tracking-widest">Enter Credentials to Initialize</p>
                    </div>

                    {/* ── ERROR FEEDBACK ── */}
                    {error && (
                        <div className="p-4 bg-rose-50/50 border-l-[3px] border-rose-500 rounded-xl flex items-start gap-3.5 animate-in slide-in-from-left-4 duration-300">
                            <div className="w-8 h-8 bg-rose-500/10 rounded-full flex items-center justify-center shrink-0">
                                <ShieldAlert size={16} className="text-rose-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[12px] font-black text-rose-900 uppercase tracking-tight">Identity Breach / Protocol Failure</p>
                                <p className="text-[13px] font-bold text-rose-600/90 leading-tight">{error}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Interface ID (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="operator@auracore.io"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-[14px] font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Secure Key</label>
                                <button type="button" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors">Reset Key</button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-[14px] font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-300"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 py-4 rounded-2xl text-white text-[14px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <><Loader2 className="animate-spin" size={18} /> Synchronizing...</>
                            ) : (
                                <><LogIn size={18} /> Authenticate Session</>
                            )}
                        </button>
                    </form>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Quick Access Tokens</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {DEMO_ACCOUNTS.map(account => (
                                <button
                                    key={account.label}
                                    onClick={() => selectDemo(account)}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${email === account.email ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                >
                                    <div className={`w-10 h-10 ${account.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                        <account.icon size={18} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-tighter ${email === account.email ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {account.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-center text-[11px] font-black text-slate-300 uppercase tracking-widest pt-8">
                        © 2026 PRECISIONHUB INDUSTRIAL SYSTEMS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;