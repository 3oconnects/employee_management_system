import React, { useState } from 'react';
import { Mail, Send, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const EmailTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState({
        smtp_host: config.smtp_host || '',
        smtp_port: config.smtp_port || '587',
        smtp_user: config.smtp_user || '',
        smtp_pass: config.smtp_pass || '',
        smtp_from: config.smtp_from || '',
        smtp_secure: config.smtp_secure || 'false',
    });
    const [testEmail, setTestEmail] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<null | boolean>(null);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'email', settings: form });
            onNotify('Email settings saved!');
            onRefresh();
        } catch { onNotify('Failed to save email settings', false); }
        finally { setSaving(false); }
    };

    const sendTest = async () => {
        if (!testEmail) return onNotify('Enter a recipient email first', false);
        setTesting(true); setTestResult(null);
        try {
            const res = await api.post('/settings/test-email', { to: testEmail });
            setTestResult(res.data.sent);
            onNotify(res.data.message, res.data.sent);
        } catch { onNotify('Test failed', false); setTestResult(false); }
        finally { setTesting(false); }
    };

    const F = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {key === 'smtp_pass' ? (
                <div className="relative">
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                        value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full px-4 py-2.5 pr-10 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            ) : (
                <input type={type} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* SMTP Config */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Mail size={16} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-slate-800">SMTP Configuration</p>
                        <p className="text-[11px] text-slate-400">Configure outbound email delivery</p>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">{F('SMTP Host', 'smtp_host', 'text', 'smtp.gmail.com')}</div>
                        <div>{F('Port', 'smtp_port', 'number', '587')}</div>
                    </div>
                    {F('Username / Email', 'smtp_user', 'email', 'noreply@company.com')}
                    {F('App Password', 'smtp_pass')}
                    {F('From Address', 'smtp_from', 'text', 'AURA EMS <noreply@company.com>')}

                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Connection Security</label>
                        <div className="flex gap-2">
                            {[{ v: 'false', l: 'STARTTLS (Port 587)' }, { v: 'true', l: 'SSL/TLS (Port 465)' }].map(opt => (
                                <button key={opt.v} onClick={() => setForm(p => ({ ...p, smtp_secure: opt.v }))}
                                    className={`flex-1 px-3 py-2 rounded-xl border text-[11px] font-bold transition-all
                                        ${form.smtp_secure === opt.v ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                                    {opt.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={save} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 disabled:opacity-60 transition-all">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save SMTP Settings
                    </button>
                </div>
            </div>

            {/* Test Email */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Send size={16} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-slate-800">Send Test Email</p>
                        <p className="text-[11px] text-slate-400">Verify your SMTP settings work</p>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recipient</label>
                        <input type="email" placeholder="your@email.com" value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                            className="w-full px-4 py-2.5 text-[13px] border border-slate-200 rounded-xl outline-none focus:border-indigo-400" />
                    </div>
                    <button onClick={sendTest} disabled={testing}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-[12px] font-bold hover:bg-emerald-500 disabled:opacity-60 transition-all">
                        {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {testing ? 'Sending...' : 'Send Test Email'}
                    </button>
                    {testResult !== null && (
                        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-[12px] font-semibold
                            ${testResult ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {testResult ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                            {testResult ? 'Email sent successfully! Check your inbox.' : 'Send failed. Check SMTP settings above.'}
                        </div>
                    )}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Gmail Setup</p>
                        <p className="text-[11px] text-slate-500">Host: <span className="font-mono font-bold">smtp.gmail.com</span> · Port: <span className="font-bold">587</span></p>
                        <p className="text-[11px] text-slate-500">Use an <strong>App Password</strong> (not your Gmail password). Enable 2FA first in Google Account.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailTab;
