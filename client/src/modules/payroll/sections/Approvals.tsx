import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    FileText,
    Loader2,
    User,
    IndianRupee,
    MessageSquare,
    Calendar,
    X,
    ClipboardCheck,
} from 'lucide-react';
import api from '../../../services/api';

const Approvals: React.FC = () => {
    const [approvals,         setApprovals]         = useState<any[]>([]);
    const [loading,           setLoading]           = useState(true);
    const [processingId,      setProcessingId]      = useState<string | null>(null);
    const [showDeadlineModal, setShowDeadlineModal] = useState(false);
    const [deadlineDate,      setDeadlineDate]      = useState('');
    const [currentDeadline,   setCurrentDeadline]   = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [claimsRes, deadlineRes] = await Promise.all([
                api.get('claims/admin'),
                api.get('payroll/deadlines/latest'),
            ]);
            setApprovals((claimsRes.data || []).filter((c: any) => c.status === 'pending'));
            setCurrentDeadline(deadlineRes.data);
            if (deadlineRes.data) setDeadlineDate(deadlineRes.data.deadline_date);
        } catch { /* noop */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await api.put(`claims/${id}/approve`);
            setApprovals(prev => prev.filter(c => c.id !== id));
        } catch { alert('Failed to approve.'); }
        finally { setProcessingId(null); }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await api.put(`claims/${id}/reject`);
            setApprovals(prev => prev.filter(c => c.id !== id));
        } catch { alert('Failed to reject.'); }
        finally { setProcessingId(null); }
    };

    const handleSaveDeadline = async () => {
        if (!deadlineDate) return;
        try {
            const res = await api.post('payroll/deadlines', { deadlineDate });
            setCurrentDeadline(res.data.deadline);
            setShowDeadlineModal(false);
        } catch { alert('Failed to save deadline.'); }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin text-indigo-600" />
            <span className="text-[13px]">Loading approvals…</span>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Header strip ──────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[14px] font-black text-slate-800 uppercase tracking-tight">Audit Queue</h3>
                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                        {approvals.length > 0 ? `${approvals.length} pending authorization` : 'System Clear — No pending claims'}
                    </p>
                </div>
                <span className={`flex items-center gap-2 text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-widest transition-all ${
                    approvals.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                    <ClipboardCheck size={12} />
                    {approvals.length > 0 ? `${approvals.length} Pending` : 'All Clear'}
                </span>
            </div>

            {/* ── Approvals table ───────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {approvals.length > 0 ? (
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    {['Personnel','Claim Type','Amount','Metadata','Operations'].map(h => (
                                        <th key={h} className="px-6 py-4 last:text-right">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {approvals.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[13px] font-black text-slate-900 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all shadow-sm">
                                                    {a.employee_name ? a.employee_name.charAt(0).toUpperCase() : <User size={13} />}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-black text-slate-800 tracking-tight uppercase">{a.employee_name || 'Anonymous'}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{a.id?.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                                {a.category || a.type || 'Reimbursement'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-[14px] font-black text-slate-900 tracking-tight">
                                                <IndianRupee size={12} className="text-slate-300" />
                                                {Number(a.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="flex items-start gap-2 text-slate-500">
                                                <MessageSquare size={12} className="mt-0.5 flex-shrink-0 text-slate-300" />
                                                <p className="text-[11px] font-medium leading-relaxed line-clamp-2">{a.description || a.reason || '—'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleReject(a.id)}
                                                    disabled={processingId !== null}
                                                    className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                >
                                                    <XCircle size={12} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={processingId !== null}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md shadow-indigo-600/10"
                                                >
                                                    <CheckCircle2 size={12} /> Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5 border border-emerald-100 shadow-sm">
                            <CheckCircle2 size={28} className="text-emerald-500" />
                        </div>
                        <p className="text-[15px] font-black text-slate-900 uppercase tracking-tight">System Purified</p>
                        <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">All authorization requests have been processed.</p>
                    </div>
                )}
            </div>

            {/* ── Investment declaration deadline ───────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 group hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <FileText size={18} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-[13px] font-black text-slate-800 uppercase tracking-tight">Fiscal Submission Window</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                            {currentDeadline
                                ? `Deadline active until ${new Date(currentDeadline.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`
                                : 'No submission deadline configured in matrix.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeadlineModal(true)}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-900/10"
                >
                    <Calendar size={13} /> Configure Window
                </button>
            </div>

            {/* ── Deadline modal ─────────────────────────────── */}
            {showDeadlineModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Configure Window</h3>
                            <button onClick={() => setShowDeadlineModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Deadline Date</label>
                                <input
                                    type="date"
                                    value={deadlineDate}
                                    onChange={e => setDeadlineDate(e.target.value)}
                                    className="w-full text-[13px] font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeadlineModal(false)}
                                    className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Abort
                                </button>
                                <button
                                    onClick={handleSaveDeadline}
                                    disabled={!deadlineDate}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Approvals;
