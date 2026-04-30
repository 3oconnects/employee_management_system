import React, { useState } from 'react';
import { Palette, Save, Loader2, Monitor, Moon, Sun, Smartphone, Type, Layout, Image } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const BrandingTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState({
        primary_color: config.primary_color || '#4f46e5',
        accent_color: config.accent_color || '#06b6d4',
        sidebar_theme: config.sidebar_theme || 'dark',
        font_family: config.font_family || 'Inter',
        border_radius: config.border_radius || '1rem',
        compact_mode: config.compact_mode || 'false',
        favicon_url: config.favicon_url || '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'branding', settings: form });
            onNotify('Branding settings applied! Refresh to see full effects.');
            onRefresh();
        } catch { onNotify('Failed to save branding', false); }
        finally { setSaving(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Visual Identity */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Palette size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Visual Identity</p>
                            <p className="text-[11px] text-slate-400">Customize the look and feel of your portal</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Brand Color</label>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <input type="color" value={form.primary_color}
                                        onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))}
                                        className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 bg-transparent" />
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold text-slate-700 uppercase">{form.primary_color}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Used for buttons, links, and active states</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Accent Color</label>
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <input type="color" value={form.accent_color}
                                        onChange={e => setForm(p => ({ ...p, accent_color: e.target.value }))}
                                        className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 bg-transparent" />
                                    <div className="flex-1">
                                        <p className="text-[13px] font-bold text-slate-700 uppercase">{form.accent_color}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Used for highlights and secondary icons</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Interface Style</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'light', label: 'Classic Light', Icon: Sun, desc: 'Clean and bright' },
                                    { id: 'dark', label: 'Deep Dark', Icon: Moon, desc: 'Modern and sleek' },
                                    { id: 'auto', label: 'System Sync', Icon: Monitor, desc: 'Follow device' },
                                ].map(t => (
                                    <button key={t.id} onClick={() => setForm(p => ({ ...p, sidebar_theme: t.id }))}
                                        className={`p-5 rounded-xl border-2 transition-all text-left
                                            ${form.sidebar_theme === t.id 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' 
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-100'}`}>
                                        <t.Icon size={20} className="mb-3" />
                                        <p className="text-[13px] font-black">{t.label}</p>
                                        <p className={`text-[10px] mt-1 ${form.sidebar_theme === t.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                            {t.desc}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <Layout size={20} className="text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Layout & Typography</p>
                            <p className="text-[11px] text-slate-400">Fine-tune the application spacing and text</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                    <Type size={12} /> Font Family
                                </label>
                                <select value={form.font_family} onChange={e => setForm(p => ({ ...p, font_family: e.target.value }))}
                                    className="w-full px-4 py-3 text-[13px] font-bold border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white">
                                    {['Inter', 'Roboto', 'Outfit', 'Plus Jakarta Sans', 'Poppins'].map(f => <option key={f}>{f}</option>)}
                                </select>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                    <Layout size={12} /> Border Radius
                                </label>
                                <select value={form.border_radius} onChange={e => setForm(p => ({ ...p, border_radius: e.target.value }))}
                                    className="w-full px-4 py-3 text-[13px] font-bold border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white">
                                    {[
                                        { id: '0', label: 'Sharp (0px)' },
                                        { id: '0.5rem', label: 'Modern (8px)' },
                                        { id: '1rem', label: 'Curvy (16px)' },
                                        { id: '2rem', label: 'Extra Curvy (32px)' },
                                    ].map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                            <Smartphone size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Density Settings</p>
                            <p className="text-[11px] text-slate-400">Optimize for different screens</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-100 group cursor-pointer"
                            onClick={() => setForm(p => ({ ...p, compact_mode: p.compact_mode === 'true' ? 'false' : 'true' }))}>
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                                    ${form.compact_mode === 'true' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                    <Layout size={14} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800">Compact Mode</p>
                                    <p className="text-[10px] text-slate-400">Reduce white space</p>
                                </div>
                            </div>
                            <div className={`w-10 h-5 rounded-full p-1 transition-all ${form.compact_mode === 'true' ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full transition-all ${form.compact_mode === 'true' ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Image size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Favicon</p>
                            <p className="text-[11px] text-slate-400">Browser tab icon</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Favicon URL</label>
                        <input type="url" value={form.favicon_url} 
                            onChange={e => setForm(p => ({ ...p, favicon_url: e.target.value }))}
                            placeholder="https://.../favicon.ico"
                            className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            Recommended size: 32x32px. Supported formats: .ico, .png, .svg
                        </p>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 text-white rounded-xl text-[14px] font-black hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-xl shadow-indigo-200">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Update Brand Styles
                </button>
            </div>
        </div>
    );
};

export default BrandingTab;
