import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Shield, Users, AlertCircle, Check, Loader2, Globe, Mail, ShieldAlert, Palette, Zap, ArrowLeft, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import RolesTab from '../components/RolesTab';
import UsersTab from '../components/UsersTab';
import GeneralTab from '../components/GeneralTab';
import EmailTab from '../components/EmailTab';
import SecurityTab from '../components/SecurityTab';
import FeatureControlTab from '../components/FeatureControlTab';
import BrandingTab from '../components/BrandingTab';
import IntegrationsTab from '../components/IntegrationsTab';
import PoliciesTab from '../components/PoliciesTab';
import type { Role, PermissionsMap } from '../components/PermissionMatrix';
import type { UserAccount } from '../components/UsersTab';

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'general' | 'roles' | 'users' | 'email' | 'security' | 'features' | 'branding' | 'integrations' | 'policies';

const TABS: { key: Exclude<Tab, 'overview'>; label: string; Icon: React.ElementType; desc: string; color: string }[] = [
    { key: 'general', label: 'General Info', Icon: Globe, desc: 'Organization details & public profile', color: 'bg-blue-600' },
    { key: 'branding', label: 'Branding', Icon: Palette, desc: 'Company logo, colors & identity', color: 'bg-purple-600' },
    { key: 'roles', label: 'Roles & Perms', Icon: Shield, desc: 'Access control & user permissions', color: 'bg-indigo-600' },
    { key: 'users', label: 'Accounts', Icon: Users, desc: 'Manage users & login accounts', color: 'bg-emerald-600' },
    { key: 'email', label: 'Email Setup', Icon: Mail, desc: 'SMTP, templates & delivery', color: 'bg-orange-600' },
    { key: 'security', label: 'Security', Icon: ShieldAlert, desc: 'Policies, 2FA & session limits', color: 'bg-rose-600' },
    { key: 'integrations', label: 'Integrations', Icon: Zap, desc: 'Webhooks & 3rd-party services', color: 'bg-amber-600' },
    { key: 'policies', label: 'Company Policies', Icon: FileText, desc: 'Manage company handbook & policies', color: 'bg-cyan-600' },
    { key: 'features', label: 'Features', Icon: Settings2, desc: 'Module control & beta tools', color: 'bg-slate-600' },
];





// ─── SETTINGS PAGE ───────────────────────────────────────────────────────────

const Settings: React.FC = () => {
    const [tab, setTab] = useState<Tab>('overview');
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<PermissionsMap>({});
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [config, setConfig] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const notify = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3200);
    };

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes, usersRes, configRes] = await Promise.all([
                api.get('/settings/roles'),
                api.get('/settings/permissions'),
                api.get('/settings/users'),
                api.get('/settings/config'),
            ]);
            setRoles(rolesRes.data.data || []);
            setPermissions(permsRes.data.data || {});
            setUsers(usersRes.data.data || {});
            setConfig(configRes.data.data || {});
        } catch {
            notify('Failed to load settings data', false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ── Loading state ────────────────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={28} className="text-indigo-500 animate-spin" />
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Loading Settings...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F5F8]">
            {/* ── Toast ─────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-[13px] font-bold animate-in slide-in-from-top-2 duration-200
                    ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {toast.ok ? <Check size={15} /> : <AlertCircle size={15} />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {tab !== 'overview' && (
                            <button 
                                onClick={() => setTab('overview')}
                                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        <div className={`w-11 h-11 ${tab === 'overview' ? 'bg-indigo-600' : 'bg-slate-800'} rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20`}>
                            <Settings2 size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-black text-slate-800">
                                {tab === 'overview' ? 'System Settings' : TABS.find(t => t.key === tab)?.label}
                            </h1>
                            <p className="text-[12px] text-slate-400 mt-0.5">
                                {tab === 'overview' 
                                    ? 'Manage organization, roles, permissions, and user accounts'
                                    : TABS.find(t => t.key === tab)?.desc}
                            </p>
                        </div>
                    </div>

                </div>

                {/* ── Tab content ───────────────────────────────────── */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
                        {TABS.map(({ key, label, Icon, desc, color }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className="group relative flex flex-col bg-white border border-slate-200 rounded-xl p-6 text-left hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
                            >
                                <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={22} />
                                </div>
                                <h3 className="text-[15px] font-black text-slate-800 mb-1.5 group-hover:text-indigo-600 transition-colors">{label}</h3>
                                <p className="text-[12px] text-slate-500 leading-relaxed line-clamp-2">
                                    {desc}
                                </p>
                                <div className="mt-auto pt-5 flex items-center justify-between text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[11px] font-black uppercase tracking-widest">Configure</span>
                                    <ChevronRight size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {tab === 'general' && (
                    <GeneralTab
                        config={config.general || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'roles' && (
                    <RolesTab
                        roles={roles}
                        permissions={permissions}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'users' && (
                    <UsersTab
                        users={users}
                        roles={roles}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'email' && (
                    <EmailTab
                        config={config.email || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'security' && (
                    <SecurityTab
                        config={config.security || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'features' && (
                    <FeatureControlTab
                        config={config.features || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'branding' && (
                    <BrandingTab
                        config={config.branding || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}

                {tab === 'integrations' && (
                    <IntegrationsTab
                        config={config.integrations || {}}
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}
                {tab === 'policies' && (
                    <PoliciesTab
                        onRefresh={loadAll}
                        onNotify={notify}
                    />
                )}
            </div>
        </div>
    );
};




export default Settings;
