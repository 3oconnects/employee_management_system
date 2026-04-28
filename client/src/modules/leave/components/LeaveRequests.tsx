import React from 'react';
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, Edit3, Trash2 } from 'lucide-react';

interface LeaveRequest {
    id: string;
    leave_type_name: string;
    start_date: string;
    end_date: string;
    reason: string;
    status: string;
}

interface LeaveRequestsProps {
    requests: LeaveRequest[];
    onEdit?: (req: LeaveRequest) => void;
    onCancel?: (id: string) => void;
}

const statusMeta: Record<string, { label: string; bg: string; text: string; icon: React.ElementType }> = {
    pending:  { label: 'Pending Audit',  bg: 'bg-amber-50',   text: 'text-amber-600',  icon: Clock },
    approved: { label: 'Verified',       bg: 'bg-emerald-50', text: 'text-emerald-600',icon: CheckCircle },
    rejected: { label: 'Declined',       bg: 'bg-rose-50',    text: 'text-rose-600',   icon: XCircle },
};

function getStatus(s: string) {
    return statusMeta[s] ?? { label: s, bg: 'bg-slate-50', text: 'text-slate-500', icon: AlertCircle };
}

export const LeaveRequests: React.FC<LeaveRequestsProps> = ({ requests, onEdit, onCancel }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div>
                    <h2 className="text-[14px] font-black text-[#0F172A] uppercase tracking-tight">Personal Transaction History</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Chronological log of leave lifecycle</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">
                            <th className="px-6 py-4">Classification</th>
                            <th className="px-6 py-4">Commencement</th>
                            <th className="px-6 py-4">Conclusion</th>
                            <th className="px-6 py-4">Justification</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4">
                                        <CalendarDays size={32} />
                                    </div>
                                    <p className="text-[13px] font-bold text-slate-900">No Requests Identified</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-1.5">Your leave history is currently empty</p>
                                </td>
                            </tr>
                        ) : (
                            requests.map(r => {
                                const s = getStatus(r.status);
                                const Icon = s.icon;
                                const isPending = r.status === 'pending';

                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="text-[13px] font-bold text-slate-900">{r.leave_type_name}</p>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-semibold text-[12px]">
                                            {new Date(r.start_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-semibold text-[12px]">
                                            {new Date(r.end_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-[12px] text-slate-400 font-medium max-w-[200px] truncate" title={r.reason}>{r.reason}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${s.bg} ${s.text}`}>
                                                <Icon size={10} />
                                                {s.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isPending && (
                                                    <>
                                                        <button 
                                                            onClick={() => onEdit?.(r)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Edit Request"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => onCancel?.(r.id)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            title="Cancel Request"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};
