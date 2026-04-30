import React, { useState } from 'react';
import { ShieldAlert, Key, Lock, Clock, Save, Loader2, Fingerprint, ShieldCheck, ShieldX, Terminal } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const SecurityTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState({
        min_password_length: config.min_password_length || '8',
        require_special_char: config.require_special_char || 'true',
        require_uppercase: config.require_uppercase || 'true',
        require_numbers: config.require_numbers || 'true',
        session_timeout: config.session_timeout || '60', 
        mfa_enabled: config.mfa_enabled || 'false',
        max_login_attempts: config.max_login_attempts || '5',
        lockout_duration: config.lockout_duration || '30',
        ip_whitelist: config.ip_whitelist || '',
        password_expiry_days: config.password_expiry_days || '90',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'security', settings: form });
            onNotify('Security policies updated successfully!');
            onRefresh();
        } catch { onNotify('Failed to update security policies', false); }
        finally { setSaving(false); }
    };

    const Toggle = (label: string, desc: string, key: keyof typeof form, Icon: any) => (
        <div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-xl hover:border-indigo-100 transition-all group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors
                    ${form[key] === 'true' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Icon size={18} />
                </div>
                <div>
                    <p className="text-[13px] font-bold text-slate-800">{label}</p>
                    <p className="text-[11px] text-slate-400">{desc}</p>
                </div>
            </div>
            <button
                onClick={() => setForm(p => ({ ...p, [key]: p[key] === 'true' ? 'false' : 'true' }))}
                className={`w-12 h-6 rounded-full p-1 transition-all
                    ${form[key] === 'true' ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full transition-all shadow-sm
                    ${form[key] === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Password Policy */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                            <Key size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Password Complexity</p>
                            <p className="text-[11px] text-slate-400">Enforce strong authentication standards</p>
                        </div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2 p-5 bg-slate-50 rounded-xl mb-2">
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Minimum Password Length</label>
                            <div className="flex items-center gap-4">
                                <input type="range" min="6" max="32" step="1" 
                                    value={form.min_password_length}
                                    onChange={e => setForm(p => ({ ...p, min_password_length: e.target.value }))}
                                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                <span className="w-12 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-[14px] font-black text-indigo-600 shadow-sm">
                                    {form.min_password_length}
                                </span>
                            </div>
                        </div>
                        {Toggle('Uppercase Letters', 'At least one A-Z character', 'require_uppercase', ShieldCheck)}
                        {Toggle('Special Characters', 'At least one @, #, $, etc.', 'require_special_char', ShieldCheck)}
                        {Toggle('Numeric Characters', 'At least one 0-9 digit', 'require_numbers', ShieldCheck)}
                        <div className="p-5 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-bold text-slate-800">Password Expiry</p>
                                <p className="text-[11px] text-slate-400">Force rotation after (days)</p>
                            </div>
                            <input type="number" value={form.password_expiry_days}
                                onChange={e => setForm(p => ({ ...p, password_expiry_days: e.target.value }))}
                                className="w-16 px-3 py-2 text-[13px] font-bold border border-slate-200 rounded-xl outline-none focus:border-indigo-400 text-center" />
                        </div>
                    </div>
                </div>

                {/* Access Control */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center">
                            <Lock size={20} className="text-rose-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Access & Intrusion Prevention</p>
                            <p className="text-[11px] text-slate-400">Manage session limits and failed login behavior</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Max Login Attempts</label>
                                <input type="number" value={form.max_login_attempts}
                                    onChange={e => setForm(p => ({ ...p, max_login_attempts: e.target.value }))}
                                    className="w-full px-4 py-3 text-[13px] font-bold border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                                <p className="text-[10px] text-slate-400 mt-2 ml-1">Account locks after this many failed tries</p>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Lockout Duration (Mins)</label>
                                <input type="number" value={form.lockout_duration}
                                    onChange={e => setForm(p => ({ ...p, lockout_duration: e.target.value }))}
                                    className="w-full px-4 py-3 text-[13px] font-bold border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                                <p className="text-[10px] text-slate-400 mt-2 ml-1">Time until account auto-unlocks</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                <Terminal size={12} /> IP Whitelisting (Optional)
                            </label>
                            <textarea value={form.ip_whitelist}
                                onChange={e => setForm(p => ({ ...p, ip_whitelist: e.target.value }))}
                                rows={2} placeholder="Comma separated IP addresses (e.g. 192.168.1.1, 10.0.0.1)"
                                className="w-full px-4 py-3 text-[13px] font-mono border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 resize-none" />
                            <p className="text-[10px] text-slate-400 mt-2 ml-1">Leave blank to allow access from any IP address</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Fingerprint size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Two-Factor Auth</p>
                            <p className="text-[11px] text-slate-400">Advanced login security</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        {Toggle('MFA Enforcement', 'Force all users to use MFA', 'mfa_enabled', ShieldCheck)}
                        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl">
                            <div className="flex items-start gap-3">
                                <ShieldAlert size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[12px] font-black text-indigo-900">Security Recommendation</p>
                                    <p className="text-[11px] text-indigo-800/70 leading-relaxed mt-1">
                                        Enabling MFA is highly recommended for administrator accounts to prevent unauthorized system access.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Clock size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Session Guard</p>
                            <p className="text-[11px] text-slate-400">Auto logout preferences</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Inactivity Timeout (Mins)</label>
                        <select value={form.session_timeout} 
                            onChange={e => setForm(p => ({ ...p, session_timeout: e.target.value }))}
                            className="w-full px-4 py-3 text-[13px] font-bold border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white transition-all">
                            {[15, 30, 60, 120, 240, 480, 1440].map(m => (
                                <option key={m} value={m}>{m} Minutes ({m >= 60 ? `${m/60} Hours` : ''})</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 text-white rounded-xl text-[14px] font-black hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-xl shadow-indigo-200">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Apply Security Policies
                </button>
            </div>
        </div>
    );
};

export default SecurityTab;
