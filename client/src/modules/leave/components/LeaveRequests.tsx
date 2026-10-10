import React, { useState, useMemo } from 'react';
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, Edit3, Trash2, LayoutGrid, List as ListIcon, Calendar, ArrowRight, MessageSquare, Plus } from 'lucide-react';

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
    onRequestNew?: () => void;
}

const statusMeta: Record<string, { label: string; bg: string; text: string; border: string; dot: string; icon: React.ElementType }> = {
    pending:  { label: 'Pending Audit',  bg: 'bg-amber-50',   text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', icon: Clock },
    approved: { label: 'Verified',       bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: CheckCircle },
    rejected: { label: 'Declined',       bg: 'bg-rose-50',    text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', icon: XCircle },
};

function getStatus(s: string) {
    return statusMeta[s] ?? { label: s, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400', icon: AlertCircle };
}

const calcDurationDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    return Math.max(1, diff);
};

export const LeaveRequests: React.FC<LeaveRequestsProps> = ({ requests, onEdit, onCancel, onRequestNew }) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

    const counts = useMemo(() => {
        return {
            all: requests.length,
            pending: requests.filter(r => r.status === 'pending').length,
            approved: requests.filter(r => r.status === 'approved').length,
            rejected: requests.filter(r => r.status === 'rejected').length,
        };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'all') return requests;
        return requests.filter(r => r.status === statusFilter);
    }, [requests, statusFilter]);

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* ── Control Header ── */}
            <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Personal Transaction History</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Chronological log of leave lifecycle & approvals</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filter Tabs */}
                    <div className="flex p-1 bg-white border border-slate-200/80 rounded-lg shadow-xs">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                                    statusFilter === tab 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {tab === 'all' ? 'All' : tab === 'pending' ? 'Pending' : tab === 'approved' ? 'Verified' : 'Declined'}
                                <span className="ml-1 opacity-80">({counts[tab]})</span>
                            </button>
                        ))}
                    </div>

                    {/* View Switcher Toggle: GRID | LIST */}
                    <div className="flex p-1 bg-white border border-slate-200/80 rounded-lg shadow-xs">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === 'grid' 
                                    ? 'bg-blue-600 text-white shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <LayoutGrid size={13} /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                viewMode === 'list' 
                                    ? 'bg-blue-600 text-white shadow-xs' 
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            <ListIcon size={13} /> List
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Content Area ── */}
            {filteredRequests.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center p-6">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center text-slate-400 mb-3 shadow-xs">
                        <CalendarDays size={26} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">No Requests Found</p>
                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                        {statusFilter === 'all' 
                            ? 'Your leave history is currently empty. Submit your first leave request when ready.'
                            : `No ${statusFilter} leave requests match the current filter.`}
                    </p>
                    {onRequestNew && statusFilter === 'all' && (
                        <button
                            onClick={onRequestNew}
                            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                        >
                            <Plus size={15} /> Request absence
                        </button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                /* ── Card / Grid View ── */
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredRequests.map(r => {
                        const s = getStatus(r.status);
                        const isPending = r.status === 'pending';
                        const days = calcDurationDays(r.start_date, r.end_date);

                        return (
                            <div 
                                key={r.id} 
                                className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                            >
                                <div>
                                    {/* Top Row: Classification & Status Pill */}
                                    <div className="flex items-center justify-between gap-2.5 mb-3.5">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                                <CalendarDays size={16} />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                                                {r.leave_type_name}
                                            </h4>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${s.bg} ${s.text} ${s.border} shrink-0`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                            {s.label}
                                        </span>
                                    </div>

                                    {/* Dates & Duration Subcard (High Contrast & Visible) */}
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 mb-3 space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                            <div className="flex items-center gap-1.5 text-slate-800">
                                                <Calendar size={13} className="text-blue-600 shrink-0" />
                                                <span>{new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <ArrowRight size={13} className="text-slate-400 shrink-0" />
                                            <div className="flex items-center gap-1.5 text-slate-800">
                                                <span>{new Date(r.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>Schedule Span</span>
                                            <span className="text-blue-700 font-bold bg-blue-50 border border-blue-100/90 px-2 py-0.5 rounded-md text-xs">
                                                {days} {days === 1 ? 'Day' : 'Days'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Justification Subcard (Clean, Legible & Structured) */}
                                    <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 mb-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                            <MessageSquare size={12} className="text-slate-400" /> Justification
                                        </p>
                                        <p className="text-xs text-slate-800 font-medium leading-relaxed" title={r.reason}>
                                            {r.reason ? `"${r.reason}"` : <span className="text-slate-400 italic">No justification provided</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Footer & Actions */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
                                    <span className="text-[11px] font-semibold text-slate-400">
                                        Ref #{String(r.id).slice(0, 6)}
                                    </span>

                                    {isPending ? (
                                        <div className="flex items-center gap-2">
                                            {onEdit && (
                                                <button
                                                    onClick={() => onEdit(r)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 bg-white border border-slate-200/90 rounded-md transition-all shadow-2xs"
                                                    title="Edit Request"
                                                >
                                                    <Edit3 size={12} /> Edit
                                                </button>
                                            )}
                                            {onCancel && (
                                                <button
                                                    onClick={() => onCancel(r.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:bg-rose-50 bg-white border border-slate-200/90 rounded-md transition-all shadow-2xs"
                                                    title="Cancel Request"
                                                >
                                                    <Trash2 size={12} /> Cancel
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[11px] font-semibold text-slate-400">
                                            Finalized
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── Table / List View ── */
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/70 text-xs font-semibold text-slate-500 border-b border-slate-200/80">
                                <th className="px-5 py-3.5">Classification</th>
                                <th className="px-5 py-3.5">Commencement</th>
                                <th className="px-5 py-3.5">Conclusion</th>
                                <th className="px-5 py-3.5">Duration</th>
                                <th className="px-5 py-3.5">Justification</th>
                                <th className="px-5 py-3.5">Status</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredRequests.map(r => {
                                const s = getStatus(r.status);
                                const isPending = r.status === 'pending';
                                const days = calcDurationDays(r.start_date, r.end_date);

                                return (
                                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-600"/>
                                                <p className="font-semibold text-slate-900">{r.leave_type_name}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                                            {new Date(r.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                                            {new Date(r.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                                                {days} {days === 1 ? 'Day' : 'Days'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <p className="text-slate-600 font-medium max-w-[240px] truncate" title={r.reason}>{r.reason || '—'}</p>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                {s.label}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            {isPending ? (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {onEdit && (
                                                        <button 
                                                            onClick={() => onEdit(r)}
                                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all border border-slate-200/90 shadow-2xs"
                                                            title="Edit Request"
                                                        >
                                                            <Edit3 size={13} />
                                                        </button>
                                                    )}
                                                    {onCancel && (
                                                        <button 
                                                            onClick={() => onCancel(r.id)}
                                                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all border border-slate-200/90 shadow-2xs"
                                                            title="Cancel Request"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-400 font-medium">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
