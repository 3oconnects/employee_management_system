import React, { useState } from 'react';
import {
    Plus, Trash2, ToggleLeft, ToggleRight,
    UserCheck, Eye, EyeOff, X, Loader2, Mail, Key, RefreshCw,
    ShieldAlert, Lock, ArrowRight, Sparkles
} from 'lucide-react';
import type { Role } from './PermissionMatrix';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

export interface UserAccount {
    id: number; name: string; email: string; role: string;
    employee_id?: string;
    role_id?: number; role_name?: string; is_active: boolean;
    department?: string; position?: string; last_login?: string;
    temp_password?: string; is_password_temp?: boolean;
}

interface Props {
    users: UserAccount[];
    roles: Role[];
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const NEW_USER_DEFAULT = { name: '', email: '', password: '', role: 'employee', role_id: '', send_welcome_email: false };

const UsersTab: React.FC<Props> = ({ users, roles, onRefresh, onNotify }) => {
    const [showModal, setShowModal] = useState(false);
    const [credentialUser, setCredentialUser] = useState<UserAccount | null>(null);
    const [revealPass, setRevealPass] = useState(false);
    const [newManualPass, setNewManualPass] = useState('');
    const [newUser, setNewUser] = useState({ ...NEW_USER_DEFAULT });
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);

    const field = (key: keyof typeof newUser, val: string) =>
        setNewUser(p => ({ ...p, [key]: val }));

    const createUser = async () => {
        if (!newUser.name || !newUser.email) {
            return onNotify('Please fill in name and email.', false);
        }
        setSaving(true);
        try {
            await api.post('/settings/users', newUser);
            onNotify('User account created!');
            setNewUser({ ...NEW_USER_DEFAULT });
            setShowModal(false);
            onRefresh();
        } catch (e: any) { onNotify(e?.message || 'Failed to create user', false); }
        finally { setSaving(false); }
    };

    const toggleStatus = async (user: UserAccount) => {
        try {
            await api.put(`/settings/users/${user.id}/status`, { is_active: !user.is_active });
            onNotify(`User ${user.is_active ? 'deactivated' : 'activated'}.`);
            onRefresh();
        } catch { onNotify('Failed to update status', false); }
    };

    const assignRole = async (userId: number, roleName: string) => {
        const role = roles.find(r => r.name === roleName);
        try {
            await api.put(`/settings/users/${userId}/role`, { role: roleName, role_id: role?.id });
            onNotify('Role assigned.');
            onRefresh();
        } catch { onNotify('Failed to assign role', false); }
    };

    const removeUser = async (user: UserAccount) => {
        if (!confirm(`Remove "${user.name}" permanently?`)) return;
        try {
            await api.delete(`/settings/users/${user.id}`);
            onNotify('User removed.');
            onRefresh();
        } catch { onNotify('Failed to remove user', false); }
    };

    const resetPassword = async (userId: number) => {
        if (!confirm('Are you sure you want to reset this user\'s password? A temporary one-time password will be generated.')) return;
        try {
            const res = await api.post(`/settings/users/${userId}/reset-password`, {});
            onNotify(`Password reset! New Temp Pass: ${res.data.temp_password}`);
            onRefresh();
        } catch { onNotify('Failed to reset password', false); }
    };

    const updatePassword = async () => {
        if (!credentialUser || !newManualPass) return;
        try {
            await api.put(`/settings/users/${credentialUser.id}/password`, { password: newManualPass });
            onNotify(`Identity key updated for ${credentialUser.name}`);
            setNewManualPass('');
            setCredentialUser(null);
            onRefresh();
        } catch { onNotify('Identity rotation failed', false); }
    };

    const autoGenerate = () => {
        const pass = 'AURA-' + Math.random().toString(36).slice(-8).toUpperCase();
        setNewManualPass(pass);
    };

    const batchProvision = async () => {
        if (!confirm('This will generate temporary passwords for ALL users and employees. Continue?')) return;
        setSaving(true);
        try {
            for (const u of users) {
                if (u.id) {
                    await api.post(`/settings/users/${u.id}/reset-password`, {});
                } else {
                    // Provision new account for employee
                    await api.post('/settings/users', { 
                        name: u.name, 
                        email: u.email, 
                        role: 'employee',
                        password: '' // backend will auto-gen
                    });
                }
            }
            onNotify('Security sync complete for all personnel.');
            onRefresh();
        } catch { onNotify('Batch synchronization failed', false); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Accounts</h2>
                    <button 
                        onClick={batchProvision}
                        disabled={saving}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Batch Security Sync
                    </button>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={16} /> New Account
                </button>
            </div>

            {/* ── Create User Modal ──────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[18px] shadow-2xl p-8 w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[16px] font-black text-slate-800">Create User Account</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        {(['name', 'email'] as const).map(k => (
                            <div key={k}>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    {k === 'name' ? 'Full Name' : 'Email Address'}
                                </label>
                                <input
                                    type={k === 'email' ? 'email' : 'text'}
                                    placeholder={k === 'name' ? 'e.g. Rahul Sharma' : 'rahul@company.com'}
                                    value={newUser[k]}
                                    onChange={e => field(k, e.target.value)}
                                    className="w-full px-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                                />
                            </div>
                        ))}

                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="Leave blank to auto-generate"
                                    value={newUser.password}
                                    onChange={e => field('password', e.target.value)}
                                    className="w-full px-4 py-2.5 pr-10 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400"
                                />
                                <button type="button" onClick={() => setShowPwd(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium italic px-1">Leave empty to auto-generate a secure temporary password.</p>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                            <select
                                value={newUser.role}
                                onChange={e => {
                                    const r = roles.find(x => x.name === e.target.value);
                                    setNewUser(p => ({ ...p, role: e.target.value, role_id: String(r?.id || '') }));
                                }}
                                className="w-full px-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400 bg-white"
                            >
                                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="sendWelcome"
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                onChange={e => setNewUser(p => ({ ...p, send_welcome_email: e.target.checked }))}
                            />
                            <label htmlFor="sendWelcome" className="text-[12px] font-semibold text-slate-600 cursor-pointer">
                                Send welcome email with temporary password
                            </label>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button onClick={createUser} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-[13px] font-bold hover:bg-indigo-500 disabled:opacity-60">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                                Create Account
                            </button>
                            <button onClick={() => setShowModal(false)}
                                className="px-6 py-3 border border-slate-200 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-50">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Users Table ───────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                {['User', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-5 py-16 text-center text-[12px] text-slate-400">
                                        No user accounts found
                                    </td>
                                </tr>
                            )}
                            {users.map(user => (
                                <tr key={user.employee_id || user.id} className="hover:bg-slate-50/50 transition-all">
                                    {/* Avatar + name */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black text-[11px] flex-shrink-0">
                                                {user.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-slate-800 truncate">{user.name}</p>
                                                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Role dropdown */}
                                    <td className="px-5 py-4">
                                        <select
                                            disabled={!user.id}
                                            value={user.role || ''}
                                            onChange={e => assignRole(user.id, e.target.value)}
                                            className={`text-[11px] font-bold px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400 cursor-pointer capitalize
                                                ${!user.id ? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`}
                                        >
                                            {!user.id && <option value="">No Account</option>}
                                            {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                        </select>
                                    </td>
                                    {/* Status toggle */}
                                    <td className="px-5 py-4">
                                        <button
                                            disabled={!user.id}
                                            onClick={() => toggleStatus(user)}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border transition-all
                                                ${!user.id 
                                                    ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                                                    : user.is_active
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                                                }`}
                                        >
                                            {user.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                                            {!user.id ? 'No Account' : user.is_active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>
                                    {/* Last login */}
                                    <td className="px-5 py-4">
                                        <p className="text-[11px] text-slate-400 whitespace-nowrap">
                                            {user.last_login
                                                ? new Date(user.last_login).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                                : 'Never'}
                                        </p>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {!user.id ? (
                                                <button
                                                    onClick={() => {
                                                        setNewUser({ ...NEW_USER_DEFAULT, name: user.name, email: user.email });
                                                        setShowModal(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-all"
                                                >
                                                    Provision Account
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const res = await api.post(`/settings/users/${user.id}/send-welcome`, {});
                                                                onNotify(res.data.message, res.data.sent);
                                                            } catch { onNotify('Failed to send welcome email', false); }
                                                        }}
                                                        title="Send Welcome Email"
                                                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                    >
                                                        <Mail size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setCredentialUser(user);
                                                            setRevealPass(false);
                                                        }}
                                                        title="Manage Credentials"
                                                        className={`p-2 rounded-xl transition-all ${user.temp_password ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                    >
                                                        {user.temp_password ? <Key size={14} /> : <Lock size={14} />}
                                                    </button>
                                                    <button
                                                        onClick={() => resetPassword(user.id)}
                                                        title="Emergency Reset"
                                                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => removeUser(user)}
                                                        className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Identity Governance: Professional Side Drawer ────────────────── */}
            <div className={`fixed inset-0 z-50 transition-opacity duration-500 ${credentialUser ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={() => { setCredentialUser(null); setRevealPass(false); }}
                />
                
                {/* Drawer Panel */}
                <div className={`absolute right-0 top-0 h-full w-full max-w-[420px] bg-white shadow-[-20px_0_80px_rgba(0,0,0,0.1)] transition-transform duration-500 transform ${credentialUser ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    
                    {/* Drawer Header */}
                    <div className="px-8 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h3 className="text-[15px] font-black text-slate-900 uppercase tracking-tight">Identity Vault</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Protocol L3 Secure</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { setCredentialUser(null); setRevealPass(false); }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-10">
                        
                        {/* 1. Personnel Identity */}
                        {credentialUser && (
                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Personnel Context</label>
                                <div className="p-6 bg-white border border-slate-200 rounded-[24px] shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-colors">
                                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 font-black text-lg">
                                        {credentialUser.name?.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-black text-slate-800">{credentialUser.name}</p>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest truncate">{credentialUser.email}</p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 2. Active Credentials */}
                        {credentialUser?.temp_password && (
                            <section className="space-y-4">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Recovery Token</label>
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Vault Active</span>
                                </div>
                                <div className={`p-6 rounded-[24px] border transition-all duration-300 ${revealPass ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            {revealPass ? (
                                                <code className="text-lg font-black text-emerald-700 tracking-[0.15em] tabular-nums">{credentialUser.temp_password}</code>
                                            ) : (
                                                <div className="flex gap-1.5">
                                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                                        <div key={i} className="w-2 h-2 bg-slate-300 rounded-full" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                if (!revealPass) setRevealPass(true);
                                                else {
                                                    navigator.clipboard.writeText(credentialUser.temp_password || '');
                                                    onNotify('Token copied to clipboard');
                                                }
                                            }}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${revealPass ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-indigo-600 border border-slate-200 hover:border-indigo-300 shadow-sm'}`}
                                        >
                                            {revealPass ? 'Copy' : 'Reveal'}
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                                    This token remains retrievable until the user completes their mandatory security rotation.
                                </p>
                            </section>
                        )}

                        {/* 3. Security Rotation Engine */}
                        <section className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Security Rotation</label>
                                <button 
                                    onClick={autoGenerate}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:text-indigo-800 transition-colors"
                                >
                                    <Sparkles size={12} /> Auto-Entropy
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                <input 
                                    type="text"
                                    value={newManualPass}
                                    onChange={e => setNewManualPass(e.target.value)}
                                    placeholder="Assign new security key..."
                                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[24px] text-[14px] font-bold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white transition-all placeholder:text-slate-300 shadow-inner"
                                />
                            </div>
                            <button 
                                onClick={updatePassword}
                                disabled={!newManualPass}
                                className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-slate-900 transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
                            >
                                Rotate Identity <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </section>
                    </div>

                    {/* Drawer Footer */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50/30">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <ShieldAlert className="text-amber-600 flex-shrink-0" size={16} />
                            <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase tracking-tighter">
                                All identity rotations are recorded in the audit logs. ensure you follow enterprise security protocols when sharing credentials.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsersTab;
