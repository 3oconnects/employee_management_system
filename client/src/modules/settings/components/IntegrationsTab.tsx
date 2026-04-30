import React, { useState } from 'react';
import { Webhook, Save, Loader2, Key, Zap, ShieldCheck, Globe, Database, Cpu } from 'lucide-react';
import api from '../../../services/api';

interface Props {
    config: Record<string, string>;
    onRefresh: () => void;
    onNotify: (msg: string, ok?: boolean) => void;
}

const IntegrationsTab: React.FC<Props> = ({ config, onRefresh, onNotify }) => {
    const [form, setForm] = useState({
        api_enabled: config.api_enabled || 'false',
        api_key: config.api_key || '••••••••••••••••••••••••',
        webhook_url: config.webhook_url || '',
        webhook_events: config.webhook_events || 'employee.created,payroll.processed',
        slack_webhook: config.slack_webhook || '',
        teams_webhook: config.teams_webhook || '',
    });
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/settings/config', { category: 'integrations', settings: form });
            onNotify('Integration settings updated!');
            onRefresh();
        } catch { onNotify('Failed to save integrations', false); }
        finally { setSaving(false); }
    };

    const generateKey = () => {
        setGenerating(true);
        setTimeout(() => {
            const key = 'aura_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
            setForm(p => ({ ...p, api_key: key, api_enabled: 'true' }));
            setGenerating(false);
            onNotify('New API key generated! Save to apply.');
        }, 800);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Developer API */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Cpu size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Developer API Access</p>
                            <p className="text-[11px] text-slate-400">Connect external tools to your EMS data</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors
                                    ${form.api_enabled === 'true' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                    <Globe size={18} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-800">Public API Access</p>
                                    <p className="text-[11px] text-slate-400">Enable REST API for this tenant</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setForm(p => ({ ...p, api_enabled: p.api_enabled === 'true' ? 'false' : 'true' }))}
                                className={`w-12 h-6 rounded-full p-1 transition-all ${form.api_enabled === 'true' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all ${form.api_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {form.api_enabled === 'true' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Private API Key</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                                                <Key size={14} />
                                            </div>
                                            <input type="text" readOnly value={form.api_key}
                                                className="w-full pl-11 pr-4 py-3 text-[13px] font-mono font-bold border border-slate-200 rounded-2xl outline-none bg-slate-50 text-slate-600" />
                                        </div>
                                        <button onClick={generateKey} disabled={generating}
                                            className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[12px] font-bold hover:bg-slate-50 transition-all shadow-sm">
                                            {generating ? <Loader2 size={14} className="animate-spin" /> : 'Regenerate'}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-rose-500 mt-2 ml-1 font-bold">
                                        ⚠️ Keep this key secret. Anyone with this key can access your data.
                                    </p>
                                </div>
                                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-3xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Database size={14} className="text-indigo-600" />
                                        <p className="text-[12px] font-black text-indigo-900">API Documentation</p>
                                    </div>
                                    <p className="text-[11px] text-indigo-800/70 leading-relaxed mb-4">
                                        Your endpoint base URL: <code className="bg-white/50 px-1 rounded">https://api.aura-ems.com/v1/{config.tenant_id || 'default'}</code>
                                    </p>
                                    <button className="text-[11px] font-bold text-indigo-600 hover:underline">View Swagger Docs →</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Webhooks */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center">
                            <Webhook size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Outgoing Webhooks</p>
                            <p className="text-[11px] text-slate-400">Push real-time updates to your servers</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Webhook URL</label>
                            <input type="url" value={form.webhook_url}
                                onChange={e => setForm(p => ({ ...p, webhook_url: e.target.value }))}
                                placeholder="https://your-server.com/webhooks/aura"
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Event Triggers</label>
                            <input type="text" value={form.webhook_events}
                                onChange={e => setForm(p => ({ ...p, webhook_events: e.target.value }))}
                                placeholder="Comma separated events"
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                            <p className="text-[10px] text-slate-400 mt-2 ml-1">
                                Available: employee.*, leave.*, payroll.*, attendance.*
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
                            <Zap size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <p className="text-[15px] font-black text-slate-800">Instant Apps</p>
                            <p className="text-[11px] text-slate-400">Notify your team via chat</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Slack Incoming Webhook</label>
                            <input type="url" value={form.slack_webhook}
                                onChange={e => setForm(p => ({ ...p, slack_webhook: e.target.value }))}
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                        </div>
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Teams Webhook URL</label>
                            <input type="url" value={form.teams_webhook}
                                onChange={e => setForm(p => ({ ...p, teams_webhook: e.target.value }))}
                                className="w-full px-4 py-3 text-[13px] font-medium border border-slate-200 rounded-2xl outline-none focus:border-indigo-400 bg-white" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-indigo-600 mb-3">
                        <ShieldCheck size={16} />
                        <p className="text-[12px] font-black">Connection Status</p>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">API Server</span>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">Slack Link</span>
                            <span className={`w-2 h-2 rounded-full ${form.slack_webhook ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                    </div>
                </div>

                <button onClick={save} disabled={saving}
                    className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-indigo-600 text-white rounded-xl text-[14px] font-black hover:bg-indigo-500 disabled:opacity-60 transition-all shadow-xl shadow-indigo-200">
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Integrations
                </button>
            </div>
        </div>
    );
};

export default IntegrationsTab;
