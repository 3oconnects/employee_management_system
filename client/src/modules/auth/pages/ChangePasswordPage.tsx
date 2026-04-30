import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Lock, ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, Key, ArrowRight } from 'lucide-react';
import api from '../../../services/api';

const ChangePasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { user, updateUser, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) return setError('Password must be at least 8 characters.');
        if (password !== confirm) return setError('Passwords do not match.');

        setLoading(true);
        try {
            await api.put('/me/password', { password });
            // Update local state to reflect that password is no longer temp
            useAuthStore.setState({ mustChangePassword: false });
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update security credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Security Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-indigo-600/20 animate-bounce">
                        <Lock size={36} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Rotation</h1>
                    <p className="text-slate-500 font-bold text-[11px] uppercase tracking-[0.2em] mt-3">Initial Access Protocol Required</p>
                </div>

                <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="bg-indigo-50/50 px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                            <Key size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Logged in as</p>
                            <p className="text-[13px] font-bold text-slate-700">{user?.email}</p>
                        </div>
                    </div>

                    <div className="p-10">
                        <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
                            <p className="text-[12px] font-medium text-amber-900 leading-relaxed">
                                Your account is using a system-generated temporary password. For security, you must establish a new private key to continue.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                <p className="text-[12px] font-bold">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">New Private Key</label>
                                <div className="relative group">
                                    <input
                                        type={showPwd ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="Min. 8 characters"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPwd(!showPwd)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                                    >
                                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Confirm Identity Key</label>
                                <input
                                    type={showPwd ? "text" : "password"}
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[14px] font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="Repeat new password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 group"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>Update Security Protocol <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={logout}
                                className="w-full text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors pt-2"
                            >
                                Cancel & Logout
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
