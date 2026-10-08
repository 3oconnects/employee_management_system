import React, { useState, useEffect, useCallback } from 'react';
import { Settings2, Shield, Users, AlertCircle, Check, Loader2, Globe, Mail, ShieldAlert, Palette, Zap, ArrowLeft, ChevronRight, FileText, CheckCircle2, User, UserCheck } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import UserSettingsTab from '../components/UserSettingsTab';
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
    const { user, hasAnyRole, hasPermission } = useAuthStore();
    const isSystemAdmin = hasAnyRole('super_admin', 'admin') || hasPermission('settings:manage');

    // Scope: 'personal' for User Settings, 'system' for System Administration
    const [scope, setScope] = useState<'personal' | 'system'>(() => isSystemAdmin ? 'system' : 'personal');
    const [tab, setTab] = useState<Tab>('overview');
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<PermissionsMap>({});
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [config, setConfig] = useState<Record<string, Record<string, string>>>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Keep non-admins strictly on personal scope
    useEffect(() => {
        if (!isSystemAdmin && scope === 'system') {
            setScope('personal');
        }
    }, [isSystemAdmin, scope]);

    const notify = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3200);
    };

    const loadAll = useCallback(async () => {
        // Only fetch system administration endpoints if the user has admin clearance
        if (!isSystemAdmin) {
            setLoading(false);
            return;
        }
        try {
            const [rolesRes, permsRes, usersRes, configRes] = await Promise.allSettled([
                api.get('/settings/roles'),
                api.get('/settings/permissions'),
                api.get('/settings/users'),
                api.get('/settings/config'),
            ]);
            if (rolesRes.status === 'fulfilled')  setRoles(rolesRes.value.data.data || []);
            if (permsRes.status === 'fulfilled')  setPermissions(permsRes.value.data.data || {});
            if (usersRes.status === 'fulfilled')  setUsers(usersRes.value.data.data || []);
            if (configRes.status === 'fulfilled') setConfig(configRes.value.data.data || {});
        } catch {
            notify('Failed to sync settings', false);
        } finally {
            setLoading(false);
        }
    }, [isSystemAdmin]);

    useEffect(() => { loadAll(); }, [loadAll]);

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

            <div className="max-w-7xl mx-auto px-6 py-5 space-y-4">
                {/* ── Header ────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {scope === 'system' && tab !== 'overview' && (
                            <button 
                                onClick={() => setTab('overview')}
                                className="w-9 h-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-2xs group"
                            >
                                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                            </button>
                        )}
                        <div className={`w-10 h-10 ${scope === 'personal' ? 'bg-indigo-600' : (tab === 'overview' ? 'bg-slate-900' : 'bg-slate-800')} rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/15`}>
                            {scope === 'personal' ? <User size={18} className="text-white" /> : <Settings2 size={18} className="text-white" />}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                                {scope === 'personal' 
                                    ? 'Personal Settings & Preferences' 
                                    : (tab === 'overview' ? 'System Administration' : TABS.find(t => t.key === tab)?.label)}
                            </h1>
                            <p className="text-[11.5px] text-slate-500 mt-0.5">
                                {scope === 'personal'
                                    ? 'Manage personal notifications, 2FA security credentials, interface theme, and policies'
                                    : (tab === 'overview' 
                                        ? 'Configure organization profile, system roles, user credentials, and platform modules'
                                        : TABS.find(t => t.key === tab)?.desc)}
                            </p>
                        </div>
                    </div>

                    {/* Scope Switcher Pill (Only displayed for Super Admins / Admins) */}
                    {isSystemAdmin && (
                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => { setScope('personal'); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scope === 'personal'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <User size={13} />
                                <span>My Preferences</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setScope('system'); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    scope === 'system'
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Shield size={13} />
                                <span>System Settings</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Content Router ─────────────────────────────────── */}
                {scope === 'personal' ? (
                    <UserSettingsTab onNotify={notify} />
                ) : (
                    <>
                        {tab === 'overview' ? (
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
                                {loading && (
                                    <div className="fixed bottom-10 right-10 flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                                        <Loader2 size={14} className="text-indigo-500 animate-spin" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Data...</span>
                                    </div>
                                )}
                            </div>
                        ) : loading ? (
                            <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                                <Loader2 size={32} className="text-indigo-500 animate-spin mb-4" />
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Establishing Secure Sync...</p>
                            </div>
                        ) : (
                            <>
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
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};




export default Settings;
