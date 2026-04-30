import React, { useState } from 'react';
import { Bell, Mail, Shield, Globe, Monitor, Save, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

interface SettingsTabProps {
    initialPreferences?: any;
    onNotify: (msg: string, ok?: boolean) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ initialPreferences, onNotify }) => {
    const [prefs, setPrefs] = useState(initialPreferences || {
        notifications: { in_app: true, email: true },
        privacy: { show_phone: true, show_email: true },
        theme: 'light'
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/auth/me/preferences', { preferences: prefs });
            onNotify('Preferences updated successfully');
        } catch (err) {
            onNotify('Failed to update preferences', false);
        } finally {
            setSaving(false);
        }
    };

    const toggleNotif = (key: 'in_app' | 'email') => {
        setPrefs({
            ...prefs,
            notifications: { ...prefs.notifications, [key]: !prefs.notifications[key] }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Notification Preferences */}
                <section className="bg-white border border-slate-200 rounded-[24px] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">Notifications</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Manage alert protocols</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <Monitor size={14} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">In-App Alerts</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Real-time role & leave updates</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleNotif('in_app')}
                                className={`w-11 h-6 rounded-full transition-all relative ${prefs.notifications.in_app ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.notifications.in_app ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                    <Mail size={14} />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">Email Sync</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Official announcements & reports</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => toggleNotif('email')}
                                className={`w-11 h-6 rounded-full transition-all relative ${prefs.notifications.email ? 'bg-indigo-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${prefs.notifications.email ? 'left-6' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. Privacy & Security */}
                <section className="bg-white border border-slate-200 rounded-[24px] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h3 className="text-[15px] font-black text-slate-800 uppercase tracking-tight">Privacy Settings</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Corporate visibility</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-[13px] font-bold text-slate-700">Show Contact Info</p>
                                <p className="text-[10px] text-slate-400 font-medium">Visible to managers & HR only</p>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-tighter">Enforced</span>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                            <Globe className="text-amber-600 flex-shrink-0" size={16} />
                            <p className="text-[10px] font-bold text-amber-900 leading-relaxed uppercase tracking-tighter">
                                your profile visibility is controlled by organization-level security policies.
                            </p>
                        </div>
                    </div>
                </section>

            </div>

            {/* Save Actions */}
            <div className="flex justify-end pt-4">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-[20px] text-[12px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Synchronize Preferences
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
