import React, { useState } from 'react';
import { LayoutGrid, Save, Loader2, Power, AlertCircle, Shield, Check } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const MODULES = [
    { key: 'dashboard', label: 'Dashboard', desc: 'Main stats and overview' },
    { key: 'employees', label: 'Employees', desc: 'Personnel management' },
    { key: 'approvals', label: 'Approvals Hub', desc: 'Workflow & action management' },
    { key: 'attendance', label: 'Attendance', desc: 'Clock-in/out tracking' },
    { key: 'leave', label: 'Leave', desc: 'Absence management' },
    { key: 'payroll', label: 'Payroll', desc: 'Salary and compliance' },
    { key: 'timesheet', label: 'Timesheets', desc: 'Project hour tracking' },
    { key: 'onboarding', label: 'Onboarding', desc: 'New hire checklists' },
    { key: 'reports', label: 'Reports', desc: 'Analytics and exports' },
    { key: 'audit', label: 'Audit Log', desc: 'System activity tracking' },
];

const ADVANCED_FEATURES = [
    { key: 'dark_mode', label: 'Experimental Dark Mode', desc: 'Enable neural-inspired dark theme' },
    { key: 'ai_assistant', label: 'AURA AI Assistant', desc: 'Conversational HR support' },
    { key: 'real_time_sync', label: 'Real-time Synchronization', desc: 'Push updates via WebSockets' },
    { key: 'bulk_actions', label: 'Bulk Batch Actions', desc: 'Process multiple items at once' },
];

const FeatureControlTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState<Record<string, string>>({
        ...Object.fromEntries(MODULES.map(m => [`module_${m.key}`, config[`module_${m.key}`] || 'true'])),
        ...Object.fromEntries(ADVANCED_FEATURES.map(f => [`feat_${f.key}`, config[`feat_${f.key}`] || 'false']))
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'features', settings: form });
            onNotify('Feature settings updated! Refresh page to see changes.');
            onRefresh();
        } catch { onNotify('Failed to update feature settings', false); }
        finally { setSaving(false); }
    };

    const toggle = (key: string) => {
        setForm(p => ({ ...p, [key]: p[key] === 'true' ? 'false' : 'true' }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Core Modules */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                        <LayoutGrid size={16} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Module Controls</p>
                        <p className="text-[11px] text-slate-400">Enable or disable core system components</p>
                    </div>
                </div>
                <div className="px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {MODULES.map(m => {
                            const key = `module_${m.key}`;
                            const enabled = form[key] === 'true';
                            return (
                                <div key={m.key} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group
                                    ${enabled ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                            ${enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                            <Power size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-[13px] font-bold ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>{m.label}</p>
                                            <p className="text-[11px] text-slate-400">{m.desc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggle(key)}
                                        className={`w-12 h-6 rounded-full p-1 transition-all ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Advanced Features */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                    <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Shield size={16} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Advanced Features</p>
                        <p className="text-[11px] text-slate-400">Experimental settings and platform optimizations</p>
                    </div>
                </div>
                <div className="px-6 py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ADVANCED_FEATURES.map(f => {
                            const key = `feat_${f.key}`;
                            const enabled = form[key] === 'true';
                            return (
                                <div key={f.key} className={`p-4 rounded-2xl border transition-all flex items-center justify-between group
                                    ${enabled ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                            ${enabled ? 'bg-amber-50 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                            <Check size={18} />
                                        </div>
                                        <div>
                                            <p className={`text-[13px] font-bold ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>{f.label}</p>
                                            <p className="text-[11px] text-slate-400">{f.desc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggle(key)}
                                        className={`w-12 h-6 rounded-full p-1 transition-all ${enabled ? 'bg-amber-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                        <AlertCircle size={14} />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Neural Sync Status: Ready</p>
                    </div>
                    <button onClick={save} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[12px] font-bold hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-xl shadow-indigo-500/20">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Finalize Platform Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeatureControlTab;
