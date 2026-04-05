import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2, Shield, CreditCard,
    FileText, AlertTriangle, Clock, Edit2, Save, X, ChevronRight, Award, Heart,
    Globe, Users, Star, CheckCircle, ArrowUpRight, Activity, Loader2, Eye
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ============================================================================
// ENTERPRISE EMPLOYEE PROFILE — Zoho People Level
// ============================================================================
// Sections: Personal · Job Details · Compensation · Leave · Attendance ·
//           Performance · Documents · Emergency Contacts
// ============================================================================

interface EmployeeProfile {
    employee: any;
    compensation: any;
    documents: any[];
    emergencyContacts: any[];
    performanceReviews: any[];
    attendanceSummary: any;
    leaveBalances: any[];
}

const TABS = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'job', label: 'Job Details', icon: Briefcase },
    { key: 'compensation', label: 'Compensation', icon: CreditCard },
    { key: 'attendance', label: 'Attendance', icon: Clock },
    { key: 'leave', label: 'Leave Balance', icon: Calendar },
    { key: 'performance', label: 'Performance', icon: Award },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'emergency', label: 'Emergency', icon: Heart },
] as const;

type TabKey = typeof TABS[number]['key'];

/* ─── Field Row ──────────────────────────────────────────── */
const FieldRow: React.FC<{ label: string; value: string | number | null | undefined; icon?: React.ElementType }> = ({
    label, value, icon: Icon
}) => (
    <div className="flex items-center py-3 border-b border-gray-50 last:border-0 gap-3">
        {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
        <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider w-36 flex-shrink-0">{label}</span>
        <span className="text-[13px] font-medium text-gray-800 flex-1">{value || '—'}</span>
    </div>
);

/* ─── Card Wrapper ───────────────────────────────────────── */
const Card: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({
    title, children, action
}) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900">{title}</h3>
            {action}
        </div>
        <div className="px-6 py-4">{children}</div>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
 * ██ PROFILE PAGE
 * ═══════════════════════════════════════════════════════════════════════════ */
const Profile: React.FC = () => {
    const { user } = useAuthStore();
    const [tab, setTab] = useState<TabKey>('overview');
    const [profile, setProfile] = useState<EmployeeProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let targetId = id;
                
                // If no ID in URL, try to find the employee record for the current user
                if (!targetId && user) {
                    const empRes = await api.get('/employees', { params: { search: user.email, limit: 1 } });
                    targetId = empRes.data?.items?.[0]?.id;
                }

                if (targetId) {
                    const { data } = await api.get(`/reports/profile/${targetId}`);
                    setProfile(data);
                    setEditForm({
                        phone: data.employee?.phone || '',
                        personal_email: data.employee?.personal_email || '',
                        blood_group: data.employee?.blood_group || '',
                        marital_status: data.employee?.marital_status || '',
                        address_line1: data.employee?.address_line1 || '',
                        address_line2: data.employee?.address_line2 || '',
                        city: data.employee?.city || '',
                        state: data.employee?.state || '',
                        pincode: data.employee?.pincode || '',
                    });
                }
            } catch (err) {
                console.error('Profile load error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, user]);

    const handleSave = async () => {
        if (!profile?.employee?.id) return;
        setSaveLoading(true);
        try {
            await api.put(`/employees/${profile.employee.id}`, editForm);
            // Refresh profile
            const { data } = await api.get(`/reports/profile/${profile.employee.id}`);
            setProfile(data);
            setEditing(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaveLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
    );

    const emp = profile?.employee;
    const comp = profile?.compensation;
    const initials = emp?.name?.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2) || user?.name?.[0] || 'U';

    // Calculate tenure
    const joinDate = emp?.join_date ? new Date(emp.join_date) : null;
    const tenureYears = joinDate ? Math.floor((Date.now() - joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;
    const tenureMonths = joinDate ? Math.floor(((Date.now() - joinDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) % 12) : 0;

    const statusColor = emp?.status === 'active' ? 'bg-emerald-500' : emp?.status === 'probation' ? 'bg-amber-500' : 'bg-red-500';
    const lifeCycleStage = emp?.exit_date ? 'Exited' : emp?.confirmation_date ? 'Confirmed' : emp?.probation_end_date ? 'On Probation' : 'Active';

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12">
            <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">

                {/* ── PROFILE HEADER ─────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Cover */}
                    <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
                    {/* Info */}
                    <div className="relative px-6 pb-5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10">
                            <div className="w-20 h-20 bg-white border-4 border-white rounded-2xl shadow-lg flex items-center justify-center text-2xl font-black text-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50 flex-shrink-0">
                                {initials}
                            </div>
                            <div className="flex-1 pt-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-black text-gray-900">{emp?.name || user?.name}</h1>
                                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full">{lifeCycleStage}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-0.5">{emp?.position || 'Employee'} · {emp?.department || 'Unassigned'}</p>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1"><Mail size={11} />{emp?.email || user?.email}</span>
                                    {emp?.phone && <span className="flex items-center gap-1"><Phone size={11} />{emp.phone}</span>}
                                    <span className="flex items-center gap-1"><Building2 size={11} />ID: {emp?.id || '—'}</span>
                                    {joinDate && (
                                        <span className="flex items-center gap-1"><Calendar size={11} />Joined {joinDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} · {tenureYears}y {tenureMonths}m</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                    <Shield size={10} className="inline mr-1" />{user?.role?.replace('_', ' ')}
                                </span>
                                {emp?.employment_type && (
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100">
                                        {emp.employment_type.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── TABS ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-50 flex gap-0 overflow-x-auto px-2">
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-3.5 text-[12px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                                    tab === t.key
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}>
                                <t.icon size={13} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── TAB CONTENT ──────────────────────────────── */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-12 lg:col-span-7">
                            <Card title="Personal Information" action={
                                <button onClick={() => editing ? handleSave() : setEditing(true)}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold ${editing ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                    {saveLoading ? <Loader2 size={12} className="animate-spin" /> : editing ? <><Save size={12} /> Save</> : <><Edit2 size={12} /> Edit</>}
                                </button>
                            }>
                                {editing ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { key: 'phone', label: 'Phone' },
                                            { key: 'personal_email', label: 'Personal Email' },
                                            { key: 'blood_group', label: 'Blood Group' },
                                            { key: 'marital_status', label: 'Marital Status' },
                                            { key: 'address_line1', label: 'Address Line 1' },
                                            { key: 'city', label: 'City' },
                                            { key: 'state', label: 'State' },
                                            { key: 'pincode', label: 'Pincode' },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label className="text-[10px] text-gray-400 uppercase font-bold">{f.label}</label>
                                                <input value={editForm[f.key] || ''} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        ))}
                                        <div className="col-span-2 flex justify-end gap-2 mt-2">
                                            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <FieldRow icon={User} label="Full Name" value={emp?.name} />
                                        <FieldRow icon={Mail} label="Work Email" value={emp?.email} />
                                        <FieldRow icon={Mail} label="Personal Email" value={emp?.personal_email} />
                                        <FieldRow icon={Phone} label="Phone" value={emp?.phone} />
                                        <FieldRow icon={Calendar} label="Date of Birth" value={emp?.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString('en-IN') : null} />
                                        <FieldRow icon={User} label="Gender" value={emp?.gender} />
                                        <FieldRow icon={Heart} label="Blood Group" value={emp?.blood_group} />
                                        <FieldRow icon={Heart} label="Marital Status" value={emp?.marital_status} />
                                        <FieldRow icon={Globe} label="Nationality" value={emp?.nationality} />
                                        <FieldRow icon={MapPin} label="Address" value={[emp?.address_line1, emp?.address_line2, emp?.city, emp?.state, emp?.pincode].filter(Boolean).join(', ') || null} />
                                    </>
                                )}
                            </Card>
                        </div>

                        <div className="col-span-12 lg:col-span-5 space-y-5">
                            {/* Quick Stats */}
                            <Card title="This Month Summary">
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Present', value: profile?.attendanceSummary?.present_days || '0', color: 'text-emerald-600 bg-emerald-50' },
                                        { label: 'Avg Hours', value: `${parseFloat(profile?.attendanceSummary?.avg_hours || '0').toFixed(1)}h`, color: 'text-blue-600 bg-blue-50' },
                                        { label: 'Late', value: profile?.attendanceSummary?.late_arrivals || '0', color: 'text-amber-600 bg-amber-50' },
                                    ].map(s => (
                                        <div key={s.label} className={`text-center py-3 rounded-xl ${s.color.split(' ')[1]}`}>
                                            <p className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Leave Balance */}
                            <Card title="Leave Balance">
                                {profile?.leaveBalances && profile.leaveBalances.length > 0 ? profile.leaveBalances.map((lb: any) => (
                                    <div key={lb.name} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${lb.available > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                            {lb.available}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[12px] font-semibold text-gray-800">{lb.name}</p>
                                            <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(lb.available / Math.max(lb.annual_quota, 1)) * 100}%` }} />
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-gray-400">{lb.used || 0}/{lb.annual_quota}</span>
                                    </div>
                                )) : <p className="text-sm text-gray-400 py-3">No leave data</p>}
                            </Card>

                            {/* Emergency Contacts */}
                            <Card title="Emergency Contacts">
                                {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? profile.emergencyContacts.map((c: any) => (
                                    <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                                        <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center">
                                            <Heart size={14} className="text-rose-500" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-gray-800">{c.name} <span className="text-gray-400 font-normal">({c.relationship})</span></p>
                                            <p className="text-[11px] text-gray-400">{c.phone}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-gray-400 py-3">No emergency contacts</p>}
                            </Card>
                        </div>
                    </div>
                )}

                {tab === 'job' && (
                    <Card title="Job Details & Lifecycle">
                        <div className="grid grid-cols-2 gap-x-8">
                            <FieldRow icon={Building2} label="Employee ID" value={emp?.id} />
                            <FieldRow icon={Briefcase} label="Position" value={emp?.position} />
                            <FieldRow icon={Building2} label="Department" value={emp?.department_name || emp?.department} />
                            <FieldRow icon={Users} label="Reporting Manager" value={emp?.manager_name} />
                            <FieldRow icon={Calendar} label="Join Date" value={emp?.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN') : null} />
                            <FieldRow icon={Calendar} label="Tenure" value={joinDate ? `${tenureYears} years, ${tenureMonths} months` : null} />
                            <FieldRow icon={Shield} label="Employment Type" value={emp?.employment_type?.replace('_', ' ')} />
                            <FieldRow icon={Shield} label="Status" value={emp?.status} />
                            <FieldRow icon={Calendar} label="Probation End" value={emp?.probation_end_date ? new Date(emp.probation_end_date).toLocaleDateString('en-IN') : null} />
                            <FieldRow icon={CheckCircle} label="Confirmation Date" value={emp?.confirmation_date ? new Date(emp.confirmation_date).toLocaleDateString('en-IN') : null} />
                            <FieldRow icon={Calendar} label="Notice Period" value={emp?.notice_period_days ? `${emp.notice_period_days} days` : null} />
                            <FieldRow icon={AlertTriangle} label="Exit Date" value={emp?.exit_date ? new Date(emp.exit_date).toLocaleDateString('en-IN') : null} />
                            {emp?.exit_reason && <FieldRow icon={AlertTriangle} label="Exit Reason" value={emp.exit_reason} />}
                        </div>

                        {/* Lifecycle Timeline */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Employee Lifecycle</h4>
                            <div className="flex items-center gap-2">
                                {[
                                    { label: 'Recruitment', done: true, color: 'bg-blue-500' },
                                    { label: 'Onboarding', done: !!emp?.join_date, color: 'bg-indigo-500' },
                                    { label: 'Probation', done: !!emp?.probation_end_date, color: 'bg-amber-500' },
                                    { label: 'Confirmed', done: !!emp?.confirmation_date, color: 'bg-emerald-500' },
                                    { label: 'Active', done: emp?.status === 'active', color: 'bg-green-500' },
                                    { label: 'Exit', done: !!emp?.exit_date, color: 'bg-red-500' },
                                ].map((step, i, arr) => (
                                    <React.Fragment key={step.label}>
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${step.done ? step.color : 'bg-gray-200'}`}>
                                                {step.done ? '✓' : i + 1}
                                            </div>
                                            <span className={`text-[9px] font-semibold ${step.done ? 'text-gray-700' : 'text-gray-300'}`}>{step.label}</span>
                                        </div>
                                        {i < arr.length - 1 && (
                                            <div className={`h-0.5 flex-1 ${step.done ? step.color : 'bg-gray-200'} rounded-full`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {tab === 'compensation' && (
                    <Card title="Compensation Details">
                        {comp ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Annual CTC', value: `₹${((comp.annual_ctc || 0) / 100000).toFixed(2)}L`, bg: 'bg-blue-50', color: 'text-blue-700' },
                                        { label: 'Monthly Gross', value: `₹${Math.round((comp.annual_ctc || 0) / 12).toLocaleString()}`, bg: 'bg-emerald-50', color: 'text-emerald-700' },
                                        { label: 'Basic', value: `₹${Math.round(comp.basic_salary || 0).toLocaleString()}`, bg: 'bg-violet-50', color: 'text-violet-700' },
                                        { label: 'HRA', value: `₹${Math.round(comp.hra || 0).toLocaleString()}`, bg: 'bg-amber-50', color: 'text-amber-700' },
                                    ].map(s => (
                                        <div key={s.label} className={`${s.bg} rounded-xl p-4 border`}>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{s.label}</p>
                                            <p className={`text-lg font-black ${s.color} mt-1`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-x-8">
                                    <FieldRow icon={CreditCard} label="Bank Account" value={comp.bank_account ? `●●●●${comp.bank_account.slice(-4)}` : null} />
                                    <FieldRow icon={Shield} label="Tax Regime" value={comp.tax_regime} />
                                    <FieldRow icon={CreditCard} label="Allowances" value={comp.allowances ? `₹${Math.round(comp.allowances).toLocaleString()}` : null} />
                                    <FieldRow icon={CreditCard} label="Bonus" value={comp.bonus ? `₹${Math.round(comp.bonus).toLocaleString()}` : null} />
                                </div>
                            </div>
                        ) : <p className="text-sm text-gray-400 py-4">No compensation data</p>}
                    </Card>
                )}

                {tab === 'attendance' && (
                    <Card title="Attendance Summary (This Month)">
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Present Days', value: profile?.attendanceSummary?.present_days || '0', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
                                { label: 'Avg Hours/Day', value: `${parseFloat(profile?.attendanceSummary?.avg_hours || '0').toFixed(1)}h`, color: 'text-blue-600 bg-blue-50', icon: Clock },
                                { label: 'Late Arrivals', value: profile?.attendanceSummary?.late_arrivals || '0', color: 'text-amber-600 bg-amber-50', icon: AlertTriangle },
                            ].map(s => (
                                <div key={s.label} className={`text-center py-6 rounded-xl ${s.color.split(' ')[1]} border`}>
                                    <s.icon size={20} className={`mx-auto mb-2 ${s.color.split(' ')[0]}`} />
                                    <p className={`text-3xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {tab === 'leave' && (
                    <Card title="Leave Balance (Current Year)">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {profile?.leaveBalances.map((lb: any) => (
                                <div key={lb.name} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <p className="text-[12px] text-gray-500 font-semibold">{lb.name}</p>
                                    <div className="flex items-end gap-1 mt-2">
                                        <span className="text-3xl font-black text-gray-900">{lb.available}</span>
                                        <span className="text-sm text-gray-400 mb-1">/ {lb.annual_quota}</span>
                                    </div>
                                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${lb.available > lb.annual_quota * 0.3 ? 'bg-emerald-500' : lb.available > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${(lb.available / Math.max(lb.annual_quota, 1)) * 100}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                                        <span>{lb.used || 0} used</span>
                                        <span>{lb.available} remaining</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {tab === 'performance' && (
                    <Card title="Performance Reviews">
                        {profile?.performanceReviews && profile.performanceReviews.length > 0 ? (
                            <div className="space-y-4">
                                {profile.performanceReviews.map((rev: any) => (
                                    <div key={rev.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-bold text-gray-900">{rev.review_period}</h4>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star key={s} size={14} className={s <= (rev.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-gray-200'} />
                                                ))}
                                                <span className="text-sm font-bold text-gray-700 ml-1">{rev.rating}/5</span>
                                            </div>
                                        </div>
                                        {rev.strengths && <p className="text-[12px] text-gray-600 mb-1"><span className="font-semibold text-emerald-600">Strengths:</span> {rev.strengths}</p>}
                                        {rev.improvements && <p className="text-[12px] text-gray-600 mb-1"><span className="font-semibold text-amber-600">Improvements:</span> {rev.improvements}</p>}
                                        {rev.goals && <p className="text-[12px] text-gray-600"><span className="font-semibold text-blue-600">Goals:</span> {rev.goals}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Award size={32} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">No performance reviews yet</p>
                            </div>
                        )}
                    </Card>
                )}

                {tab === 'documents' && (
                    <Card title="Documents">
                        {profile?.documents && profile.documents.length > 0 ? (
                            <div className="space-y-2">
                                {profile.documents.map((doc: any) => (
                                    <div key={doc.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all">
                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                            <FileText size={16} className="text-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[13px] font-semibold text-gray-800">{doc.document_name}</p>
                                            <p className="text-[10px] text-gray-400">{doc.document_type} · {new Date(doc.created_at).toLocaleDateString('en-IN')}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${doc.verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {doc.verified ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText size={32} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">No documents uploaded yet</p>
                            </div>
                        )}
                    </Card>
                )}

                {tab === 'emergency' && (
                    <Card title="Emergency Contacts">
                        {profile?.emergencyContacts && profile.emergencyContacts.length > 0 ? (
                            <div className="space-y-3">
                                {profile.emergencyContacts.map((c: any) => (
                                    <div key={c.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
                                            <Heart size={18} className="text-rose-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[14px] font-bold text-gray-800">{c.name}</p>
                                            <p className="text-[12px] text-gray-400">{c.relationship}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[13px] font-semibold text-gray-700">{c.phone}</p>
                                            {c.email && <p className="text-[11px] text-gray-400">{c.email}</p>}
                                        </div>
                                        {c.is_primary && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Primary</span>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Heart size={32} className="mx-auto text-gray-200 mb-3" />
                                <p className="text-sm text-gray-400">No emergency contacts added</p>
                            </div>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
};

export default Profile;