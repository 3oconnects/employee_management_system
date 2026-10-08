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
    Clock,
    AlertCircle,
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
        } catch { alert('Failed to approve request.'); }
        finally { setProcessingId(null); }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await api.put(`claims/${id}/reject`);
            setApprovals(prev => prev.filter(c => c.id !== id));
        } catch { alert('Failed to reject request.'); }
        finally { setProcessingId(null); }
    };

    const handleSaveDeadline = async () => {
        if (!deadlineDate) return;
        try {
            const res = await api.post('payroll/deadlines', { deadlineDate });
            setCurrentDeadline(res.data.deadline);
            setShowDeadlineModal(false);
        } catch { alert('Failed to save submission deadline.'); }
    };

    const totalPendingAmount = approvals.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 size={22} className="animate-spin text-blue-600" />
            <span className="text-xs font-medium text-slate-500">Loading pending approvals…</span>
        </div>
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-200">
            {/* ── Summary & Deadline Bar ─────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500">Pending Claims</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{approvals.length}</div>
                    <p className="text-xs text-slate-400 mt-1">Awaiting manager or HR review</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                    <span className="text-xs font-semibold text-slate-500">Total Pending Value</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                        ₹{totalPendingAmount.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Reimbursements & claims total</p>
                </div>

                <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div>
                        <span className="text-xs font-semibold text-slate-500">Submission Window</span>
                        <div className="text-sm font-bold text-slate-900 mt-1">
                            {currentDeadline
                                ? new Date(currentDeadline.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'No deadline set'}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Cut-off for current cycle</p>
                    </div>
                    <button
                        onClick={() => setShowDeadlineModal(true)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                    >
                        Edit Date
                    </button>
                </div>
            </div>

            {/* ── Approvals Table ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Pending Expense & Reimbursement Claims</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Approve claims to include them in the upcoming pay run</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        approvals.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}>
                        {approvals.length > 0 ? `${approvals.length} Pending Review` : 'All Clear'}
                    </span>
                </div>

                {approvals.length > 0 ? (
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-200/80">
                                    <th className="px-5 py-3.5">Employee</th>
                                    <th className="px-5 py-3.5">Claim Category</th>
                                    <th className="px-5 py-3.5">Claim Amount</th>
                                    <th className="px-5 py-3.5">Description & Purpose</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {approvals.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {a.employee_name ? a.employee_name.charAt(0).toUpperCase() : <User size={14} />}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900">{a.employee_name || 'Employee'}</span>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">Ref: {a.id?.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-semibold border border-indigo-100">
                                                {a.category || a.type || 'Reimbursement'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-bold text-slate-900 text-sm">
                                                ₹{Number(a.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-[260px]">
                                            <div className="flex items-start gap-2 text-slate-600">
                                                <MessageSquare size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                <p className="line-clamp-2 text-xs">{a.description || a.reason || 'No description provided'}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleReject(a.id)}
                                                    disabled={processingId !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                                >
                                                    <XCircle size={13} />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={processingId !== null}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
                                                >
                                                    <CheckCircle2 size={13} />
                                                    Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">All Approvals Completed</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">There are no pending claims or reimbursement requests requiring authorization.</p>
                    </div>
                )}
            </div>

            {/* ── Deadline Modal ─────────────────────────────── */}
            {showDeadlineModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="text-sm font-semibold text-slate-900">Set Claims Cut-off Date</h3>
                            <button onClick={() => setShowDeadlineModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-600">Cut-off Deadline Date</label>
                                <input
                                    type="date"
                                    value={deadlineDate}
                                    onChange={e => setDeadlineDate(e.target.value)}
                                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                            <div className="flex gap-2.5 pt-2">
                                <button
                                    onClick={() => setShowDeadlineModal(false)}
                                    className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDeadline}
                                    disabled={!deadlineDate}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-xs"
                                >
                                    Save Deadline
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
