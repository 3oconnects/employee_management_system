import React, { useState, useEffect } from 'react';
import {
    Calendar, Briefcase, CreditCard, FileText, Heart, Clock, Edit2, Save,
    Users, Loader2, AlertCircle, RefreshCw, User
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import type { ProfileData } from './widgets/ProfileShared';

/* ── Tab Widgets ─────────────────────────────────────────── */
import PersonalTab     from './widgets/PersonalTab';
import JobTab          from './widgets/JobTab';
import CompensationTab from './widgets/CompensationTab';
import AttendanceTab   from './widgets/AttendanceTab';
import LeaveTab        from './widgets/LeaveTab';
import DocumentsTab    from './widgets/DocumentsTab';
import EmergencyTab    from './widgets/EmergencyTab';

/* ── Tab definitions ─────────────────────────────────────── */
type Tab = 'personal' | 'job' | 'compensation' | 'attendance' | 'leave' | 'documents' | 'emergency';

const TABS: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'personal',     label: 'Personal',     icon: User,        color: '#6366f1' },
    { key: 'job',          label: 'Job',           icon: Briefcase,   color: '#8b5cf6' },
    { key: 'compensation', label: 'Compensation',  icon: CreditCard,  color: '#10b981' },
    { key: 'attendance',   label: 'Attendance',    icon: Clock,       color: '#f59e0b' },
    { key: 'leave',        label: 'Leave',         icon: Calendar,    color: '#6366f1' },
    { key: 'documents',    label: 'Documents',     icon: FileText,    color: '#0ea5e9' },
    { key: 'emergency',    label: 'Emergency',     icon: Heart,       color: '#ef4444' },
];

/* ═══════════════════════════════════════════════════════════
   MySpaceProfile — Thin orchestrator
═══════════════════════════════════════════════════════════ */
const MySpaceProfile: React.FC = () => {
    const { user } = useAuthStore();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);
    const [tab,     setTab]     = useState<Tab>('personal');
    const [editing, setEditing] = useState(false);
    const [saving,  setSaving]  = useState(false);
    const [form,    setForm]    = useState<Record<string, string>>({});

    const load = async () => {
        if (!user) return;
        setLoading(true); setError(null);
        try {
            const empRes = await api.get('/employees', { params: { search: user.email, limit: 1 } });
            const empId  = empRes.data?.items?.[0]?.id;
            if (!empId) { setError('No employee record linked to your account.'); return; }
            const { data } = await api.get(`/reports/profile/${empId}`);
            setProfile(data);
            setForm({
                phone:          data.employee?.phone          || '',
                personal_email: data.employee?.personal_email || '',
                blood_group:    data.employee?.blood_group    || '',
                marital_status: data.employee?.marital_status || '',
                address_line1:  data.employee?.address_line1  || '',
                city:           data.employee?.city           || '',
                state:          data.employee?.state          || '',
                pincode:        data.employee?.pincode        || '',
            });
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Failed to load profile');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user?.id]);

    const save = async () => {
        if (!profile?.employee?.id) return;
        setSaving(true);
        try {
            await api.put(`/employees/${profile.employee.id}`, form);
            const { data } = await api.get(`/reports/profile/${profile.employee.id}`);
            setProfile(data); setEditing(false);
        } catch (e: any) { alert(e?.response?.data?.message || 'Update failed'); }
        finally { setSaving(false); }
    };

    const emp  = profile?.employee;
    const joinDate     = emp?.join_date ? new Date(emp.join_date) : null;
    const tenureYears  = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
    const tenureMonths = joinDate ? Math.floor(((Date.now() - joinDate.getTime()) / (30.44 * 24 * 3600 * 1000)) % 12) : 0;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="px-6 pt-5 pb-0 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">My Profile</p>
                    <h3 className="text-[15px] font-black text-slate-800">{emp?.name || user?.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {tab === 'personal' && (
                        editing ? (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setEditing(false)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                                <button onClick={save} disabled={saving}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-all">
                                    {saving && <Loader2 size={11} className="animate-spin"/>}
                                    <Save size={11}/> Save Changes
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setEditing(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white">
                                <Edit2 size={11}/> Edit
                            </button>
                        )
                    )}
                    <button onClick={load}
                        className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        <RefreshCw size={13}/>
                    </button>
                </div>
            </div>

            {/* ── Tab bar ────────────────────────────────────── */}
            <div className="px-6 mt-4 flex items-center gap-1 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {TABS.map(t => {
                    const active = tab === t.key;
                    return (
                        <button key={t.key} onClick={() => { setTab(t.key); setEditing(false); }}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 transition-all flex-shrink-0 -mb-px
                                ${active ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'}`}>
                            <t.icon size={13} style={active ? { color: t.color } : undefined}/>
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ────────────────────────────────── */}
            <div className="p-6">
                {loading && (
                    <div className="space-y-6 animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="h-2.5 bg-slate-100 rounded-full w-1/4" />
                                    <div className="h-9 bg-slate-50 rounded-xl border border-slate-100 w-full" />
                                </div>
                            ))}
                        </div>
                        <div className="pt-4 space-y-4">
                            <div className="h-2.5 bg-slate-100 rounded-full w-1/6" />
                            <div className="h-24 bg-slate-50 rounded-xl border border-slate-100 w-full" />
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-[12px] font-bold text-amber-900">{error}</p>
                            <button onClick={load} className="mt-1.5 text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1">
                                <RefreshCw size={10}/> Retry
                            </button>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {tab === 'personal'     && <PersonalTab emp={emp} editing={editing} saving={saving} form={form} onFormChange={setForm} onSave={save} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)}/>}
                        {tab === 'job'           && <JobTab emp={emp} tenureYears={tenureYears} tenureMonths={tenureMonths} joinDate={joinDate}/>}
                        {tab === 'compensation'  && <CompensationTab comp={profile?.compensation}/>}
                        {tab === 'attendance'    && <AttendanceTab attendanceSummary={profile?.attendanceSummary} userId={user?.id}/>}
                        {tab === 'leave'         && <LeaveTab leaveBalances={profile?.leaveBalances || []}/>}
                        {tab === 'documents'     && <DocumentsTab documents={profile?.documents || []}/>}
                        {tab === 'emergency'     && <EmergencyTab contacts={profile?.emergencyContacts || []}/>}
                    </>
                )}
            </div>
        </div>
    );
};

export default MySpaceProfile;
