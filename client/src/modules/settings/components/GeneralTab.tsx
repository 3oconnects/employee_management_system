import React, { useState } from 'react';
import { Save, Building2, Globe, Clock, Loader2, Link, Phone, Mail, MapPin, Hash, UserCircle2 } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore', 'Asia/Dubai', 'Australia/Sydney'];
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY'];

const GeneralTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState({
        org_name: config.org_name || '',
        org_email: config.org_email || '',
        org_phone: config.org_phone || '',
        org_address: config.org_address || '',
        timezone: config.timezone || 'Asia/Kolkata',
        date_format: config.date_format || 'DD/MM/YYYY',
        currency: config.currency || 'INR',
        fiscal_year_start: config.fiscal_year_start || '04',
        app_url: config.app_url || '',
        support_email: config.support_email || '',
        support_phone: config.support_phone || '',
        logo_url: config.logo_url || '',
        tax_id: config.tax_id || '',
        registration_no: config.registration_no || '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'general', settings: form });
            onNotify('Organization settings saved successfully!');
            onRefresh();
        } catch { onNotify('Failed to save settings', false); }
        finally { setSaving(false); }
    };

    const F = (label: string, key: keyof typeof form, type = 'text', placeholder = '', Icon?: any) => (
        <div className="group">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1.5 ml-1">{label}</label>
            <div className="relative">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors">
                        <Icon size={14} />
                    </div>
                )}
                <input type={type} placeholder={placeholder}
                    value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className={`w-full ${Icon ? 'pl-11' : 'px-4'} py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white`} />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Building2 size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Organization Profile</p>
                            <p className="text-[11px] text-slate-400">Manage your company's identity and legal info</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {F('Organization Name', 'org_name', 'text', 'e.g. Acme Industries', Building2)}
                            {F('Tax Identification Number (TIN/VAT)', 'tax_id', 'text', 'GSTIN or VAT ID', Hash)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {F('Primary Email', 'org_email', 'email', 'admin@company.com', Mail)}
                            {F('Contact Number', 'org_phone', 'text', '+1 234 567 8900', Phone)}
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1.5 ml-1">Headquarters Address</label>
                            <div className="relative">
                                <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500">
                                    <MapPin size={14} />
                                </div>
                                <textarea value={form.org_address}
                                    onChange={e => setForm(p => ({ ...p, org_address: e.target.value }))}
                                    rows={3} placeholder="Complete office address"
                                    className="w-full pl-11 pr-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all resize-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {F('Business Registration No', 'registration_no', 'text', 'Company Reg ID', Hash)}
                            {F('Official App URL', 'app_url', 'url', 'https://aura.ems.com', Link)}
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                            <UserCircle2 size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Support & Branding</p>
                            <p className="text-[11px] text-slate-400">Helpdesk info and company assets</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {F('Support Email', 'support_email', 'email', 'support@company.com', Mail)}
                            {F('Support Hotline', 'support_phone', 'text', '1-800-ACME-HELP', Phone)}
                        </div>
                        {F('Company Logo URL', 'logo_url', 'url', 'https://path-to-your-logo.png', Globe)}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                            {form.logo_url ? (
                                <img src={form.logo_url} alt="Logo Preview" className="w-12 h-12 rounded-xl object-contain bg-white p-1 border" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                                    <Building2 size={20} />
                                </div>
                            )}
                            <div>
                                <p className="text-[12px] font-bold text-slate-700">Logo Preview</p>
                                <p className="text-[10px] text-slate-400">Ensure URL is public and in PNG/SVG format</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar / Localization */}
            <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <Globe size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Localization</p>
                            <p className="text-[11px] text-slate-400">Regional and fiscal preferences</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">Timezone</label>
                            <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))}
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 bg-white transition-all">
                                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-3 ml-1">Date Format</label>
                            <div className="grid grid-cols-1 gap-2">
                                {DATE_FORMATS.map(fmt => (
                                    <button key={fmt} onClick={() => setForm(p => ({ ...p, date_format: fmt }))}
                                        className={`px-4 py-2.5 rounded-xl border text-[12px] font-bold transition-all text-left flex items-center justify-between
                                            ${form.date_format === fmt 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-300'}`}>
                                        {fmt}
                                        {form.date_format === fmt && <Clock size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">Default Currency</label>
                            <select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 bg-white transition-all">
                                {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">Fiscal Year Start</label>
                            <select value={form.fiscal_year_start}
                                onChange={e => setForm(p => ({ ...p, fiscal_year_start: e.target.value }))}
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 bg-white transition-all">
                                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                                    <option key={m} value={m}>
                                        {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-xl text-white shadow-xl shadow-indigo-200">
                    <p className="text-[14px] font-black mb-2">Need Assistance?</p>
                    <p className="text-[11px] text-indigo-100 leading-relaxed mb-6">
                        Changes to organization settings affect reports, payroll, and email templates globally.
                    </p>
                    <button onClick={save} disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-indigo-600 rounded-2xl text-[13px] font-black hover:bg-indigo-50 disabled:opacity-60 transition-all shadow-lg">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save All Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeneralTab;
