import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, FileText, Loader2, User, IndianRupee, MessageSquare, Calendar, X } from 'lucide-react';
import api from '../../../services/api';

const Approvals = () => {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showDeadlineModal, setShowDeadlineModal] = useState(false);
    const [deadlineDate, setDeadlineDate] = useState('');
    const [currentDeadline, setCurrentDeadline] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [claimsRes, deadlineRes] = await Promise.all([
                api.get('claims/admin'),
                api.get('payroll/deadlines/latest')
            ]);
            // Only show pending claims in the approvals table
            const pendingClaims = (claimsRes.data || []).filter((c: any) => c.status === 'pending');
            setApprovals(pendingClaims);
            setCurrentDeadline(deadlineRes.data);
            if (deadlineRes.data) setDeadlineDate(deadlineRes.data.deadline_date);
        } catch (err) {
            console.error('Data fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await api.put(`claims/${id}/approve`);
            setApprovals(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Approval error:', err);
            alert('Failed to approve request.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await api.put(`claims/${id}/reject`);
            setApprovals(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Rejection error:', err);
            alert('Failed to reject request.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleSaveDeadline = async () => {
        if (!deadlineDate) return;
        try {
            const res = await api.post('payroll/deadlines', { deadlineDate });
            setCurrentDeadline(res.data.deadline);
            setShowDeadlineModal(false);
        } catch (err) {
            console.error('Save deadline error:', err);
            alert('Failed to save deadline.');
        }
    };

    if (loading && approvals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-32 space-y-4">
                <Loader2 size={40} className="animate-spin text-blue-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Querying Approval Vault...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] text-white">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Pending Approval Requests</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Financial Compliance Control Hub</p>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Queue Status</p>
                        <p className="text-xl font-black text-emerald-400">{approvals.length} Pending</p>
                    </div>
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                        <History size={20} className="text-blue-400" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl overflow-hidden shadow-slate-200/20">
                {approvals.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {approvals.map((a: any) => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-xs font-black group-hover:bg-blue-600 transition-colors">
                                                    {a.employee_name ? a.employee_name.charAt(0) : <User size={14} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{a.employee_name || 'Anonymous'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {a.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 italic">
                                                {a.category || a.type || 'REIMBURSEMENT'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <IndianRupee size={12} className="text-slate-400" />
                                                <p className="text-sm font-black text-slate-900">{Number(a.amount || 0).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7 max-w-xs">
                                            <div className="flex items-start space-x-2 text-slate-500">
                                                <MessageSquare size={14} className="mt-0.5 shrink-0" />
                                                <p className="text-[11px] font-bold line-clamp-2 italic">{a.description || a.reason || 'No justification provided'}</p>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => handleReject(a.id)}
                                                    disabled={processingId !== null}
                                                    className="p-2 border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 rounded-xl transition-all active:scale-90 disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={processingId !== null}
                                                    className="p-2 bg-slate-900 text-white hover:bg-emerald-600 rounded-xl transition-all active:scale-90 disabled:opacity-50 shadow-lg shadow-slate-200"
                                                    title="Approve"
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-32 space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-inner">
                            <CheckCircle2 size={48} />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">All caught up!</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending approval requests found in the ledger.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-blue-600 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between text-white shadow-2xl shadow-blue-500/20">
                <div className="flex items-center space-x-4 mb-6 md:mb-0">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-widest">Investment Declaration Audit</h4>
                        <p className="text-xs font-bold text-blue-100">
                            {currentDeadline
                                ? `Employees must submit tax proof documents before ${new Date(currentDeadline.deadline_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.`
                                : "No submission deadline configured."}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowDeadlineModal(true)}
                    className="px-8 py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:scale-105 transition-transform active:scale-95"
                >
                    Configure Deadlines
                </button>
            </div>

            {/* Deadline Configuration Modal */}
            {showDeadlineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                            <h3 className="text-lg font-black tracking-tight">Investment Proof Deadline</h3>
                            <button onClick={() => setShowDeadlineModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                    <Calendar size={12} className="mr-2" />
                                    Select Deadline Date
                                </label>
                                <input
                                    type="date"
                                    value={deadlineDate}
                                    onChange={(e) => setDeadlineDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={() => setShowDeadlineModal(false)}
                                    className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDeadline}
                                    className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
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
