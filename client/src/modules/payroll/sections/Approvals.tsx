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
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-[13px]">Loading approvals…</span>
        </div>
    );

    return (
        <div className="space-y-5">

            {/* ── Header strip ──────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-[13px] font-bold text-gray-800">Pending Approval Requests</h3>
                    <p className="text-[11.5px] text-gray-400 mt-0.5">
                        {approvals.length > 0 ? `${approvals.length} request${approvals.length > 1 ? 's' : ''} awaiting action` : 'All caught up — no pending requests'}
                    </p>
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${
                    approvals.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                    <ClipboardCheck size={12} />
                    {approvals.length > 0 ? `${approvals.length} Pending` : 'All Clear'}
                </span>
            </div>

            {/* ── Approvals table ───────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {approvals.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {['Employee','Type','Amount','Reason','Actions'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider last:text-right">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {approvals.map((a: any) => (
                                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                        {/* Employee */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[12px] font-bold text-blue-600 flex-shrink-0">
                                                    {a.employee_name ? a.employee_name.charAt(0).toUpperCase() : <User size={13} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{a.employee_name || 'Anonymous'}</p>
                                                    <p className="text-[10.5px] text-gray-400">{a.id?.slice(0, 8)}…</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Type */}
                                        <td className="px-5 py-4">
                                            <span className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10.5px] font-semibold border border-blue-100">
                                                {a.category || a.type || 'Reimbursement'}
                                            </span>
                                        </td>
                                        {/* Amount */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1 font-semibold text-gray-800">
                                                <IndianRupee size={12} className="text-gray-400" />
                                                {Number(a.amount || 0).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        {/* Reason */}
                                        <td className="px-5 py-4 max-w-[220px]">
                                            <div className="flex items-start gap-2 text-gray-500">
                                                <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                                <p className="text-[11.5px] line-clamp-2">{a.description || a.reason || '—'}</p>
                                            </div>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleReject(a.id)}
                                                    disabled={processingId !== null}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-lg text-[11.5px] font-semibold transition-all disabled:opacity-50"
                                                >
                                                    <XCircle size={13} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={processingId !== null}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white hover:bg-emerald-600 rounded-lg text-[11.5px] font-semibold transition-all disabled:opacity-50 shadow-sm"
                                                >
                                                    <CheckCircle2 size={13} /> Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={28} className="text-emerald-500" />
                        </div>
                        <p className="text-[13.5px] font-semibold text-gray-700">All caught up!</p>
                        <p className="text-[11.5px] text-gray-400 mt-1">No pending approval requests found.</p>
                    </div>
                )}
            </div>

            {/* ── Investment declaration deadline ───────────── */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText size={17} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-gray-800">Investment Declaration Deadline</p>
                        <p className="text-[11.5px] text-gray-400 mt-0.5">
                            {currentDeadline
                                ? `Employees must submit tax proof before ${new Date(currentDeadline.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`
                                : 'No submission deadline configured yet.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeadlineModal(true)}
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[12.5px] font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
                >
                    <Calendar size={13} /> Configure
                </button>
            </div>

            {/* ── Deadline modal ─────────────────────────────── */}
            {showDeadlineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-[14px] font-bold text-gray-900">Configure Submission Deadline</h3>
                            <button onClick={() => setShowDeadlineModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Select Deadline Date</label>
                                <input
                                    type="date"
                                    value={deadlineDate}
                                    onChange={e => setDeadlineDate(e.target.value)}
                                    className="w-full text-[13px] text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeadlineModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-[13px] font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDeadline}
                                    disabled={!deadlineDate}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-[13px] font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm shadow-blue-200"
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
