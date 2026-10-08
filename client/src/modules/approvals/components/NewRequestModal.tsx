import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Calendar, Clock, Users, Building2, Loader2, CheckCircle2, ArrowLeft, Shield, Briefcase, ArrowLeftRight, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

type Kind = 'leave' | 'attendance' | 'role_change' | 'promotion' | 'team_change' | 'team' | 'department';

interface Props {
    onClose: () => void;
    /** called after a request was filed so the list can reload */
    onCreated: () => void;
}

const field = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all';
const label = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5';

const Field: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div><span className={label}>{title}</span>{children}</div>
);

const NewRequestModal: React.FC<Props> = ({ onClose, onCreated }) => {
    const { user, hasPermission } = useAuthStore();
    const canOrg = hasPermission('organization:manage') || hasPermission('employees:manage');

    const kinds: { id: Kind; title: string; hint: string; icon: React.ReactNode }[] = [
        { id: 'leave', title: 'Leave', hint: 'Time off request', icon: <Calendar size={18} /> },
        { id: 'attendance', title: 'Attendance Fix', hint: 'Correct a check-in/out', icon: <Clock size={18} /> },
        { id: 'role_change', title: 'Role Change', hint: 'Request a new role', icon: <Shield size={18} /> },
        { id: 'promotion', title: 'Promotion', hint: 'Request a new title', icon: <Briefcase size={18} /> },
        { id: 'team_change', title: 'Team Change', hint: 'Move to another team', icon: <ArrowLeftRight size={18} /> },
        ...(canOrg ? [
            { id: 'team' as Kind, title: 'New Team', hint: 'Create a team', icon: <Users size={18} /> },
            { id: 'department' as Kind, title: 'New Department', hint: 'Create a department', icon: <Building2 size={18} /> },
        ] : []),
    ];

    const [kind, setKind] = useState<Kind | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // shared lookups
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [balances, setBalances] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [people, setPeople] = useState<any[]>([]);
    const [members, setMembers] = useState<string[]>([]);
    const [lead, setLead] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    // form state (one flat bag, only the relevant keys are used per kind)
    const [f, setF] = useState<Record<string, string>>({});
    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setError('');
        setF(prev => ({ ...prev, [k]: e.target.value }));
    };

    useEffect(() => {
        if (kind === 'leave') {
            api.get('/leave/types').then(r => setLeaveTypes(r.data.items || [])).catch(() => {});
            if (user?.id) {
                api.get('/leave/balance', { params: { userId: user.id } })
                    .then(r => setBalances(r.data.balances || []))
                    .catch(() => {});
            }
        }
        if (kind === 'role_change') api.get('/employees/roles').then(r => setRoles(r.data.data || [])).catch(() => {});
        if (kind === 'team') api.get('/employees', { params: { limit: 200 } }).then(r => setPeople(r.data.items || [])).catch(() => {});
        if (kind === 'team_change') api.get('/organization/teams').then(r => setTeams(r.data.data || r.data.items || [])).catch(() => {});
        if (kind === 'team') api.get('/organization/departments').then(r => setDepartments(r.data.data || [])).catch(() => {});
    }, [kind, user?.id]);

    const selectedBalance = balances.find(b => String(b.leave_type_id) === String(f.leave_type_id));
    let leaveDays: number | null = null;
    let leaveExceeds = false;

    if (kind === 'leave' && f.start_date && f.end_date) {
        const s = new Date(f.start_date);
        const e = new Date(f.end_date);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
            leaveDays = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
            if (selectedBalance && selectedBalance.available !== undefined && leaveDays > Number(selectedBalance.available)) {
                leaveExceeds = true;
            }
        }
    }

    const today = new Date().toISOString().slice(0, 10);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (kind === 'leave') {
                if (!f.leave_type_id) {
                    setError('Please select a leave type.');
                    setSaving(false);
                    return;
                }
                if (leaveExceeds) {
                    setError(`Insufficient leave balance: You requested ${leaveDays} days, but only ${selectedBalance?.available} ${selectedBalance?.available === 1 ? 'day is' : 'days are'} available (${selectedBalance?.pending || 0} days currently pending approval).`);
                    setSaving(false);
                    return;
                }
                await api.post('/leave/apply', {
                    userId: user?.id,
                    leave_type_id: Number(f.leave_type_id),
                    start_date: f.start_date,
                    end_date: f.end_date,
                    reason: f.reason,
                });
            } else if (kind === 'attendance') {
                await api.post('/attendance/regularize', {
                    date: f.date, check_in_time: f.check_in, check_out_time: f.check_out || null, reason: f.reason,
                });
            } else if (kind === 'role_change' || kind === 'promotion' || kind === 'team_change') {
                await api.post('/approvals/request', { type: kind, ...f });
            } else if (kind === 'team') {
                if (!members.length) { setError('Add at least one team member.'); setSaving(false); return; }
                await api.post('/organization/teams', {
                    name: f.name, department_id: Number(f.department_id), description: f.description || undefined,
                    member_ids: members, manager_id: lead ? Number(lead) : undefined,
                });
            } else if (kind === 'department') {
                await api.post('/organization/departments', { name: f.name, description: f.description || undefined });
            }
            setDone(true);
            onCreated();
            setTimeout(onClose, 1400);
        } catch (err: any) {
            const msg = err.message || err.response?.data?.message || err.response?.data?.error || 'Could not submit the request.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const current = kinds.find(k => k.id === kind);

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={onClose}>
            <div className={`w-full ${!kind ? 'max-w-[500px]' : kind === 'team' ? 'max-w-[560px]' : 'max-w-[460px]'} bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col`} onMouseDown={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        {kind && !done && (
                            <button type="button" onClick={() => { setKind(null); setF({}); setError(''); }}
                                className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"><ArrowLeft size={16} /></button>
                        )}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">{current ? current.title : 'New request'}</h3>
                            <p className="text-[11px] text-slate-400">{current ? (kind === 'team' || kind === 'department' ? 'Approved by an administrator' : kind === 'role_change' ? 'Approved by an administrator' : 'Goes to your reporting manager for approval') : 'What do you need approved?'}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X size={16} /></button>
                </div>

                {done ? (
                    <div className="px-6 py-12 flex flex-col items-center gap-3 text-center">
                        <CheckCircle2 size={36} className="text-emerald-500" />
                        <p className="text-sm font-bold text-slate-800">Request submitted</p>
                        <p className="text-xs text-slate-400">You can follow it under My Requests.</p>
                    </div>
                ) : !kind ? (
                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {kinds.map((k, i) => {
                            const wide = kinds.length % 3 === 1 && i === kinds.length - 1; // no lonely half-row
                            return (
                                <button key={k.id} type="button" onClick={() => setKind(k.id)}
                                    className={`group flex ${wide ? 'sm:col-span-3 flex-row justify-center gap-3' : 'flex-col'} items-center text-center gap-1.5 px-3 py-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all`}>
                                    <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">{k.icon}</span>
                                    <span>
                                        <span className="block text-[12.5px] font-bold text-slate-800 leading-tight">{k.title}</span>
                                        <span className="block text-[10.5px] text-slate-400 mt-0.5 leading-tight">{k.hint}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
                        {kind === 'leave' && (<>
                            {/* Leave Quota & Pending Status in Popup */}
                            {selectedBalance ? (
                                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-700">{selectedBalance.name} Balance</span>
                                        <span className="text-[10px] font-semibold text-slate-500">Annual Quota: {selectedBalance.annual_quota} days</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available</div>
                                            <div className="text-sm font-extrabold text-emerald-600">{selectedBalance.available} {selectedBalance.available === 1 ? 'day' : 'days'}</div>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</div>
                                            <div className="text-sm font-extrabold text-amber-600">{selectedBalance.pending || 0} {selectedBalance.pending === 1 ? 'day' : 'days'}</div>
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Used</div>
                                            <div className="text-sm font-extrabold text-slate-600">{selectedBalance.used || 0} {selectedBalance.used === 1 ? 'day' : 'days'}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : balances.length > 0 && (
                                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3">
                                    <div className="text-[11px] font-bold text-slate-700 mb-2">Your Leave Quotas & Pending</div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        {balances.slice(0, 3).map((b: any) => (
                                            <div key={b.leave_type_id} className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-xs">
                                                <div className="text-[11px] font-bold text-slate-800 truncate">{b.name}</div>
                                                <div className="text-xs font-extrabold text-emerald-600 mt-0.5">{b.available} left</div>
                                                <div className="text-[10px] text-amber-600 font-semibold">{b.pending || 0} pending</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Field title="Leave type">
                                <select required value={f.leave_type_id || ''} onChange={set('leave_type_id')} className={field}>
                                    <option value="">Select leave type</option>
                                    {leaveTypes.map(t => {
                                        const b = balances.find(x => String(x.leave_type_id) === String(t.id));
                                        return (
                                            <option key={t.id} value={t.id}>
                                                {t.name} {b ? `(${b.available} available, ${b.pending || 0} pending)` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field title="From"><input required type="date" value={f.start_date || ''} onChange={set('start_date')} className={field} /></Field>
                                <Field title="To"><input required type="date" min={f.start_date} value={f.end_date || ''} onChange={set('end_date')} className={field} /></Field>
                            </div>

                            {leaveDays !== null && leaveDays > 0 && (
                                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-200">
                                    <span className="text-slate-600">Calculated Duration:</span>
                                    <span className="font-bold text-slate-900">{leaveDays} {leaveDays === 1 ? 'day' : 'days'}</span>
                                </div>
                            )}

                            {leaveExceeds && (
                                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs animate-in fade-in duration-200">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div className="leading-relaxed">
                                        <span className="font-bold">Insufficient leave balance: </span>
                                        <span>You requested {leaveDays} days, but only {selectedBalance?.available} {selectedBalance?.available === 1 ? 'day is' : 'days are'} available ({selectedBalance?.pending || 0} days currently pending approval).</span>
                                    </div>
                                </div>
                            )}

                            <Field title="Reason"><textarea required rows={3} value={f.reason || ''} onChange={set('reason')} className={field} placeholder="Why do you need this leave?" /></Field>
                        </>)}

                        {kind === 'attendance' && (<>
                            <Field title="Affected date"><input required type="date" max={today} value={f.date || ''} onChange={set('date')} className={field} /></Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field title="Check in"><input required type="time" value={f.check_in || ''} onChange={set('check_in')} className={field} /></Field>
                                <Field title="Check out"><input type="time" value={f.check_out || ''} onChange={set('check_out')} className={field} /></Field>
                            </div>
                            <Field title="Reason"><textarea required rows={3} value={f.reason || ''} onChange={set('reason')} className={field} placeholder="e.g. Forgot to check in, on-duty visit" /></Field>
                            <p className="text-[11px] text-slate-400">Decided by your reporting manager.</p>
                        </>)}

                        {kind === 'role_change' && (<>
                            <Field title="Requested role">
                                <select required value={f.requested_role_id || ''}
                                    onChange={e => {
                                        const r = roles.find(x => String(x.id) === e.target.value);
                                        setF(prev => ({ ...prev, requested_role_id: e.target.value, requested_role: r?.name || '' }));
                                    }} className={field}>
                                    <option value="">Select a role</option>
                                    {roles.filter(r => r.name !== 'super_admin' && (r.name !== 'admin' || hasPermission('roles:manage') || user?.role === 'super_admin'))
                                        .map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </Field>
                            <Field title="Reason"><textarea required rows={3} value={f.reason || ''} onChange={set('reason')} className={field} placeholder="Why is this change needed?" /></Field>
                            <p className="text-[11px] text-slate-400">A role change is approved by an administrator and applies immediately once approved.</p>
                        </>)}

                        {kind === 'promotion' && (<>
                            <Field title="Requested designation"><input required value={f.requested_designation || ''} onChange={set('requested_designation')} className={field} placeholder="e.g. Senior Engineer" /></Field>
                            <Field title="Effective from"><input type="date" min={today} value={f.effective_date || ''} onChange={set('effective_date')} className={field} /></Field>
                            <Field title="Reason"><textarea required rows={3} value={f.reason || ''} onChange={set('reason')} className={field} placeholder="Achievements or scope that justify it" /></Field>
                        </>)}

                        {kind === 'team_change' && (<>
                            <Field title="Move to team">
                                <select required value={f.target_team_id || ''}
                                    onChange={e => {
                                        const t = teams.find(x => String(x.id) === e.target.value);
                                        setF(prev => ({ ...prev, target_team_id: e.target.value, target_team: t?.name || '' }));
                                    }} className={field}>
                                    <option value="">Select team</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </Field>
                            <Field title="Effective from"><input type="date" min={today} value={f.effective_date || ''} onChange={set('effective_date')} className={field} /></Field>
                            <Field title="Reason"><textarea required rows={3} value={f.reason || ''} onChange={set('reason')} className={field} /></Field>
                        </>)}

                        {kind === 'team' && (<>
                            <Field title="Team name"><input required value={f.name || ''} onChange={set('name')} className={field} placeholder="e.g. Platform Engineering" /></Field>
                            <Field title="Department">
                                <select required value={f.department_id || ''} onChange={set('department_id')} className={field}>
                                    <option value="">Select department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </Field>
                            <Field title="Description"><textarea rows={2} value={f.description || ''} onChange={set('description')} className={field} placeholder="What will this team own?" /></Field>
                            <div>
                                <span className={label}>Team members ({members.length} selected)</span>
                                <div className="relative mb-2">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search people…" className={`${field} pl-9`} />
                                </div>
                                <div className="max-h-[200px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                                    {people.filter(p => `${p.name} ${p.position || ''} ${p.department || ''}`.toLowerCase().includes(memberSearch.toLowerCase())).map(p => {
                                        const on = members.includes(String(p.id));
                                        return (
                                            <label key={p.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${on ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                                                <input type="checkbox" checked={on} className="accent-indigo-600"
                                                    onChange={() => setMembers(m => on ? m.filter(x => x !== String(p.id)) : [...m, String(p.id)])} />
                                                <span className="flex-1 min-w-0">
                                                    <span className="block text-[12px] font-semibold text-slate-800 truncate">{p.name}</span>
                                                    <span className="block text-[10px] text-slate-400 truncate">{p.position || 'Employee'} · {p.department || '—'}</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                    {people.length === 0 && <p className="text-center text-[11px] text-slate-400 py-6">No people found</p>}
                                </div>
                            </div>
                            <Field title="Team lead (optional)">
                                <select value={lead} onChange={e => setLead(e.target.value)} className={field}>
                                    <option value="">No lead yet</option>
                                    {people.filter(p => members.includes(String(p.id)) && p.user_id).map(p => <option key={p.id} value={p.user_id}>{p.name}</option>)}
                                </select>
                            </Field>
                            <p className="text-[11px] text-slate-400">Once approved, the team is created and everyone selected is moved into it.</p>
                        </>)}

                        {kind === 'department' && (<>
                            <Field title="Department name"><input required value={f.name || ''} onChange={set('name')} className={field} placeholder="e.g. Customer Success" /></Field>
                            <Field title="Description"><textarea rows={2} value={f.description || ''} onChange={set('description')} className={field} placeholder="What does it cover?" /></Field>
                        </>)}

                        {error && (
                            <div className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
                                <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={saving || (kind === 'leave' && leaveExceeds)}
                                className="flex-[1.4] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {saving && <Loader2 size={14} className="animate-spin" />} Submit request
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NewRequestModal;
