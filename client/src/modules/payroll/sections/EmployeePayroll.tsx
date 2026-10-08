import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Download, CheckCircle2, Loader2, Plus, Clock, XCircle, X, Send,
    Wallet, Receipt, TrendingUp, Inbox, CalendarDays, Plane, Stethoscope, Utensils, Tag, Info
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { fmtCurrency } from '../../../utils/formatters';

interface Payslip {
    id: number;
    employee: string;
    employee_id: string;
    month: string;
    year: string;
    net_salary: string | number;
    paid_at: string;
}

interface Claim {
    id: number;
    employee_id: string;
    category: string;
    amount: string | number;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MAX_CLAIM = 10_000_000;
/** Older records can hold absurd values; they must not distort totals or break the layout. */
const isSane = (n: unknown) => Number.isFinite(Number(n)) && Number(n) > 0 && Number(n) <= MAX_CLAIM;

const CATEGORY_ICON: Record<string, React.ReactNode> = {
    Travel: <Plane size={15} />, Medical: <Stethoscope size={15} />, Food: <Utensils size={15} />,
};
const STATUS_STYLE: Record<string, { chip: string; icon: React.ReactNode; label: string }> = {
    pending:  { chip: 'bg-amber-50 text-amber-700 border-amber-200',    icon: <Clock size={11} />,        label: 'Pending' },
    approved: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={11} />, label: 'Approved' },
    rejected: { chip: 'bg-rose-50 text-rose-700 border-rose-200',       icon: <XCircle size={11} />,      label: 'Rejected' },
};

const EmployeePayroll = () => {
    const { user } = useAuthStore();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);
    const [claimError, setClaimError] = useState('');
    const [claimFilter, setClaimFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [downloading, setDownloading] = useState<number | null>(null);

    const [claimData, setClaimData] = useState({ type: 'Travel', amount: '', reason: '' });

    const fetchData = async () => {
        const empId = user?.employee_id;
        if (!empId) { setLoading(false); return; }
        setLoading(true);
        try {
            const [payslipsRes, claimsRes] = await Promise.all([
                api.get(`payroll/history/${empId}`),
                api.get(`claims/employee/${empId}`),
            ]);
            setPayslips(payslipsRes.data.payroll_history || []);
            setClaims(claimsRes.data || []);
        } catch (err) {
            console.error('Failed to load employee claims/history:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user?.id]);

    const sortedSlips = useMemo(
        () => [...payslips].sort((a, b) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month))),
        [payslips]
    );
    const latest = sortedSlips[0];
    const thisYear = String(new Date().getFullYear());
    const ytd = sortedSlips.filter(p => String(p.year) === thisYear).reduce((n, p) => n + Number(p.net_salary || 0), 0);
    const pendingClaims = claims.filter(c => c.status === 'pending');
    const pendingAmount = pendingClaims.filter(c => isSane(c.amount)).reduce((n, c) => n + Number(c.amount), 0);
    const reimbursed = claims.filter(c => c.status === 'approved' && isSane(c.amount)).reduce((n, c) => n + Number(c.amount), 0);
    const shownClaims = claims.filter(c => claimFilter === 'all' || c.status === claimFilter);

    const downloadPayslip = async (p: Payslip) => {
        const monthLabel = MONTHS[parseInt(p.month) - 1] || p.month;
        setDownloading(p.id);
        try {
            const res = await api.get(
                `/payroll/payslip/${encodeURIComponent(p.employee_id)}/monthly?month=${p.month}&year=${p.year}`,
                { responseType: 'blob' }
            );
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(p.employee || p.employee_id).replace(/[^a-zA-Z0-9]/g, '_')}_${monthLabel}_${p.year}_Payslip.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            alert('Failed to download payslip.');
        } finally {
            setDownloading(null);
        }
    };

    const handleClaimSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const empId = user?.employee_id;
        const amount = Number(claimData.amount);
        if (!empId || !claimData.reason.trim()) return;
        if (!(amount > 0) || amount > MAX_CLAIM) {
            setClaimError(`Enter an amount between ₹1 and ${fmtCurrency(MAX_CLAIM)}.`);
            return;
        }
        setSubmittingClaim(true);
        setClaimError('');
        try {
            await api.post('claims', { employee_id: empId, category: claimData.type, amount, description: claimData.reason.trim() });
            setShowClaimModal(false);
            setClaimData({ type: 'Travel', amount: '', reason: '' });
            fetchData();
        } catch (error: any) {
            setClaimError(error.response?.data?.message || 'Failed to submit claim.');
        } finally {
            setSubmittingClaim(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 size={28} className="text-indigo-600 animate-spin" />
            <p className="text-xs font-medium text-slate-400">Loading your payroll…</p>
        </div>
    );

    return (
        <div className="space-y-6 min-w-0">
            {/* ── Summary row ─────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-w-0">
                {/* Hero: latest pay */}
                <div className={`lg:col-span-2 min-w-0 relative overflow-hidden rounded-2xl ${latest ? 'p-6' : 'px-6 py-5'} text-white flex flex-col justify-center bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/20`}>
                    <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
                    <div className="absolute right-16 -bottom-16 w-40 h-40 rounded-full bg-white/5" />
                    <div className="relative">
                        <p className="text-[11px] font-semibold text-indigo-100 flex items-center gap-1.5">
                            <Wallet size={13} /> {latest ? `Latest net pay · ${MONTHS_LONG[parseInt(latest.month) - 1]} ${latest.year}` : 'Latest net pay'}
                        </p>
                        {latest ? (
                            <>
                                <p className="text-[34px] leading-tight font-black tracking-tight mt-2">{fmtCurrency(Number(latest.net_salary))}</p>
                                <div className="flex flex-wrap items-center gap-3 mt-4">
                                    <button onClick={() => downloadPayslip(latest)} disabled={downloading === latest.id}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-50 transition-all disabled:opacity-60">
                                        {downloading === latest.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Download payslip
                                    </button>
                                    <span className="text-[11px] text-indigo-100">Paid {latest.paid_at ? new Date(latest.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[22px] leading-tight font-black tracking-tight mt-1.5">No payslip yet</p>
                                <p className="text-xs text-indigo-100 mt-2 max-w-md leading-relaxed">
                                    It appears here once payroll is processed for you.
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Compact stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5 min-w-0">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"><TrendingUp size={13} className="text-emerald-500" /> Earned in {thisYear}</p>
                        <p className="text-[22px] font-black text-slate-900 tracking-tight mt-1.5">{fmtCurrency(ytd)}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sortedSlips.filter(p => String(p.year) === thisYear).length} payslip(s) this year</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"><Receipt size={13} className="text-amber-500" /> Claims</p>
                        <p className="text-[22px] font-black text-slate-900 tracking-tight mt-1.5 truncate">{fmtCurrency(reimbursed)}</p>
                        <p className="text-[11px] text-slate-400">reimbursed so far</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{pendingClaims.length} pending · {fmtCurrency(pendingAmount)} awaiting approval</p>
                    </div>
                </div>
            </div>

            {/* ── Payslips + Claims ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-w-0">
                {/* Payslips */}
                <section className="lg:col-span-3 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Payslips</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Your monthly salary statements</p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">{sortedSlips.length} total</span>
                    </div>
                    {sortedSlips.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                            {sortedSlips.map(p => (
                                <li key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0"><FileText size={17} /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-bold text-slate-800">{MONTHS_LONG[parseInt(p.month) - 1]} {p.year}</p>
                                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><CalendarDays size={11} /> Paid {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
                                    </div>
                                    <p className="text-[14px] font-black text-slate-900 tabular-nums">{fmtCurrency(Number(p.net_salary))}</p>
                                    <button onClick={() => downloadPayslip(p)} disabled={downloading === p.id} title="Download PDF"
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all disabled:opacity-60">
                                        {downloading === p.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="py-16 px-8 flex flex-col items-center text-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center"><FileText size={26} /></div>
                            <p className="text-sm font-bold text-slate-700">No payslips yet</p>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Payslips are generated after each pay run. Once yours is processed you can view and download it here.</p>
                        </div>
                    )}
                </section>

                {/* Claims */}
                <section className="lg:col-span-2 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Expense claims</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">Reimbursements you have requested</p>
                        </div>
                        <button onClick={() => { setClaimError(''); setShowClaimModal(true); }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all">
                            <Plus size={14} /> New claim
                        </button>
                    </div>

                    {claims.length > 0 && (
                        <div className="flex gap-1.5 px-6 pt-3">
                            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                                <button key={f} onClick={() => setClaimFilter(f)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${claimFilter === f ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}

                    {shownClaims.length > 0 ? (
                        <ul className="divide-y divide-slate-100 mt-2 flex-1">
                            {shownClaims.map(c => {
                                const st = STATUS_STYLE[c.status] || STATUS_STYLE.pending;
                                return (
                                    <li key={c.id} className="flex items-start gap-3 px-6 py-3.5">
                                        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                                            {CATEGORY_ICON[c.category] || <Tag size={15} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-[13px] font-bold text-slate-800 truncate">{c.category || 'General'}</p>
                                                {isSane(c.amount)
                                                    ? <p className="text-[13px] font-black text-slate-900 tabular-nums flex-shrink-0">{fmtCurrency(Number(c.amount))}</p>
                                                    : <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex-shrink-0">Invalid amount</span>}
                                            </div>
                                            {c.description && <p className="text-[11px] text-slate-400 truncate mt-0.5">{c.description}</p>}
                                            <div className="flex items-center justify-between mt-1.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.chip}`}>{st.icon}{st.label}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(c.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="py-14 px-8 flex flex-col items-center text-center gap-3 flex-1">
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-300 flex items-center justify-center"><Inbox size={26} /></div>
                            <p className="text-sm font-bold text-slate-700">{claims.length ? `No ${claimFilter} claims` : 'No claims yet'}</p>
                            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                                {claims.length ? 'Try another filter.' : 'Spent money on work travel, medical or meals? Raise a claim and track it here.'}
                            </p>
                            {!claims.length && (
                                <button onClick={() => { setClaimError(''); setShowClaimModal(true); }}
                                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-all">
                                    <Plus size={14} /> Raise your first claim
                                </button>
                            )}
                        </div>
                    )}
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2 text-[11px] text-slate-400">
                        <Info size={12} /> Claims are reviewed by the finance team.
                    </div>
                </section>
            </div>

            {/* ── Claim Modal ─────────────────────────────── */}
            {showClaimModal && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => setShowClaimModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onMouseDown={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-bold text-slate-900">New expense claim</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Reviewed by the finance team</p>
                            </div>
                            <button onClick={() => setShowClaimModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"><X size={16} /></button>
                        </div>
                        <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                                    <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                                        value={claimData.type} onChange={e => setClaimData({ ...claimData, type: e.target.value })}>
                                        <option value="Travel">Travel</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Food">Meals</option>
                                        <option value="Other">Miscellaneous</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (₹)</label>
                                    <input type="number" required min={1} max={MAX_CLAIM} step="0.01" placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                                        value={claimData.amount} onChange={e => setClaimData({ ...claimData, amount: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Reason</label>
                                <textarea required rows={3} maxLength={500} placeholder="What was the expense for?"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 resize-none"
                                    value={claimData.reason} onChange={e => setClaimData({ ...claimData, reason: e.target.value })} />
                            </div>
                            {claimError && <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{claimError}</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setShowClaimModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={submittingClaim}
                                    className="flex-[1.4] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                                    {submittingClaim ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit claim
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default EmployeePayroll;
