import React from 'react';
import {
    Clock, User, XCircle, CheckCircle2, Loader2, Activity, ChevronRight, X, Calendar, ArrowRight, ExternalLink,
    ShieldCheck, HelpCircle, Mail, KeyRound
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { BaseApprovalRequest, ApprovalStatus } from '../types';
import { getTypeColor, formatAmount, formatDateSpan } from '../utils/approvalUtils';

interface ApprovalCardProps {
    req: BaseApprovalRequest;
    isExpanded: boolean;
    setExpandedId: (id: string | null) => void;
    handleAction: (id: string, action: 'approve' | 'reject', type: string) => void;
    acting: string | null;
    viewMode: 'list' | 'grid' | 'teams';
    activeTab: ApprovalStatus | 'history' | 'mine';
    getTypeIcon: (type: string) => React.ReactNode;
    getTypeName: (type: string) => string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const s = (status || '').toLowerCase();
    if (s === 'approved' || s === 'completed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200/90 whitespace-nowrap shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Approved
            </span>
        );
    }
    if (s === 'rejected' || s === 'declined') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-rose-50 text-rose-700 border-rose-200/90 whitespace-nowrap shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Rejected
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 text-amber-700 border-amber-200/90 whitespace-nowrap shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
        </span>
    );
};

const formatProperValue = (key: string, val: any): string => {
    if (val === null || val === undefined || val === '') return '—';
    const k = key.toLowerCase();

    // 1. Currency / Amount
    if (/(amount|cost|salary|fee|price|budget)/i.test(k)) {
        const num = Number(val);
        if (!isNaN(num)) {
            if (num >= 0 && num < 10000000) { // < 1 Crore
                return `₹${num.toLocaleString('en-IN', {
                    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
                    maximumFractionDigits: 2
                })}`;
            }
            if (num >= 10000000 && num < 1000000000) { // 1 Cr - 100 Cr
                return `₹${(num / 10000000).toFixed(2)} Cr`;
            }
            if (num >= 1000000000) {
                return `₹${num.toExponential(2)}`;
            }
            return `₹${num.toFixed(2)}`;
        }
    }

    // 2. Dates
    if (/(date|deadline|start|end)/i.test(k) && typeof val === 'string' && (val.includes('-') || val.includes('/'))) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    }

    // 3. Hours
    if (/hours/i.test(k)) {
        const num = Number(val);
        if (!isNaN(num)) return `${num} hrs`;
    }

    // 4. Days
    if (/(^days$|^duration$)/i.test(k)) {
        const num = Number(val);
        if (!isNaN(num)) return `${num} day${num === 1 ? '' : 's'}`;
    }

    // 5. Excessive decimals
    if (typeof val === 'number') {
        return Number.isInteger(val) ? String(val) : val.toFixed(2);
    }
    if (typeof val === 'string') {
        const num = Number(val);
        if (!isNaN(num) && val.includes('.') && val.split('.')[1].length > 2) {
            return num.toFixed(2);
        }
    }

    return String(val);
};

interface RequestDetailRow {
    label: string;
    value: string;
}

const getRequestDetails = (req: BaseApprovalRequest): RequestDetailRow[] => {
    const meta = req.metadata || {};
    const type = req.type as string;

    if (type === 'leave') {
        const start = meta.start_date ? formatProperValue('date', meta.start_date) : '';
        const end = meta.end_date ? formatProperValue('date', meta.end_date) : '';
        const dateSpan = start && end ? (start === end ? start : `${start} – ${end}`) : start || end || '—';
        const leaveTypeName = meta.leave_type || meta.type || 'Leave';

        return [
            { label: 'Dates', value: dateSpan },
            { label: 'Reason', value: meta.reason || leaveTypeName }
        ];
    }

    if (type === 'attendance') {
        const date = meta.date ? formatProperValue('date', meta.date) : (meta.affected_date ? formatProperValue('date', meta.affected_date) : '—');
        const reason = meta.reason || 'Attendance adjustment';

        return [
            { label: 'Date', value: date },
            { label: 'Reason', value: reason }
        ];
    }

    if (type === 'password_reset') {
        return [
            { label: 'Request', value: 'Credentials Reset' },
            { label: 'Reason', value: meta.reason ? `"${meta.reason}"` : 'Forgotten password' }
        ];
    }

    if (type === 'timesheet') {
        return [
            { label: 'Project', value: meta.project || 'Project Work' },
            { label: 'Hours', value: meta.hours ? `${meta.hours} hrs` : '—' }
        ];
    }

    if (type === 'role_change' || type === 'promotion') {
        return [
            { label: 'Role', value: meta.requested_role || meta.requested_designation || 'New Title' },
            { label: 'Reason', value: meta.reason || 'Career progression' }
        ];
    }

    if (type === 'team_change' || type === 'team' || type === 'department') {
        return [
            { label: 'Target', value: meta.target_team || meta.name || 'Organization Update' },
            { label: 'Reason', value: meta.reason || meta.description || 'Structure update' }
        ];
    }

    // Fallback: take top 2 filtered metadata keys
    const fallbackRows = getDisplayMetadata(meta);
    if (fallbackRows.length > 0) {
        return fallbackRows.map(([k, v]) => ({
            label: k.replace(/_/g, ' '),
            value: formatProperValue(k, v)
        }));
    }

    return [
        { label: 'Type', value: req.type.replace(/_/g, ' ') },
        { label: 'Status', value: req.status }
    ];
};

const getDisplayMetadata = (metadata: any) => {
    if (!metadata || typeof metadata !== 'object') return [];
    return Object.entries(metadata)
        .filter(([k, v]) => {
            if (v === null || v === undefined || v === '' || typeof v === 'object') return false;
            const lk = k.toLowerCase();
            return !/(^|_)(id|tenant_id|user_id|department_id|parent_team_id|token|password|salt|hash|token_hash|requested_at|expires_at)$/i.test(lk);
        })
        .slice(0, 2);
};

const ApprovalCard: React.FC<ApprovalCardProps> = ({
    req,
    isExpanded,
    setExpandedId,
    handleAction,
    acting,
    viewMode,
    activeTab,
    getTypeIcon,
    getTypeName
}) => {
    const formattedDate = new Date(req.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    const initials = (req.employee_name || 'U')
        .split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const typeColor = getTypeColor(req.type);

    // ── 1. TEAMS VIEW (Compact Stacked Card inside Column) ──
    if (viewMode === 'teams') {
        const rows = getRequestDetails(req);

        return (
            <div className={`bg-white border rounded-xl p-4 transition-all flex flex-col gap-3 group shadow-xs hover:shadow-md
                ${isExpanded ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200/90 hover:border-slate-300'}`}
            >
                {/* Header Row: Category Badge + Status Badge */}
                <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeColor.bg} ${typeColor.text} ${typeColor.border} truncate`}>
                        {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 13 })}
                        <span>{getTypeName(req.type)}</span>
                    </span>
                    <StatusBadge status={req.status} />
                </div>

                {/* Middle Row: Employee Details */}
                <div
                    className="flex items-center gap-3 cursor-pointer py-0.5"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight truncate">
                            {req.employee_name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 truncate">
                            <span className="font-semibold text-slate-600">
                                {req.employee_id}
                            </span>
                            {req.department && (
                                <>
                                    <span className="text-slate-300">•</span>
                                    <span className="truncate">{req.department}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all shrink-0">
                        <ChevronRight size={15} />
                    </div>
                </div>

                {/* Key details with uniform formatting */}
                <div className="bg-slate-50/90 rounded-lg border border-slate-100 divide-y divide-slate-100">
                    {rows.map((r, idx) => (
                        <div key={idx} className="px-3 py-1.5 flex items-center justify-between gap-3">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider shrink-0">{r.label}</span>
                            <span className="font-semibold text-slate-700 text-[11px] truncate text-right max-w-[170px]" title={r.value}>{r.value}</span>
                        </div>
                    ))}
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2 mt-auto">
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                disabled={!!acting}
                                className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                <XCircle size={14} />
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                disabled={!!acting}
                                className="flex-[1.4] py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                            >
                                {acting === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Approve
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-medium">Submitted {formattedDate}</span>
                            <button
                                onClick={() => setExpandedId(req.id)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                Details <ArrowRight size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {isExpanded && createPortal(
                    <ApprovalDetailModal
                        req={req}
                        activeTab={activeTab}
                        acting={acting}
                        getTypeIcon={getTypeIcon}
                        getTypeName={getTypeName}
                        handleAction={handleAction}
                        onClose={() => setExpandedId(null)}
                        formattedDate={formattedDate}
                    />,
                    document.body
                )}
            </div>
        );
    }

    // ── 2. GRID VIEW (Professional Polished Card - Symmetric & Uniform) ──
    if (viewMode === 'grid') {
        const detailRows = getRequestDetails(req);

        return (
            <div className={`bg-white border rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all group shadow-xs hover:shadow-md h-full min-h-[265px]
                ${isExpanded ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200/90 hover:border-slate-300'}`}
            >
                <div className="flex flex-col">
                    {/* Top Header Row: Icon + Category Badge on Left | Status Badge on Right */}
                    <div className="flex items-center justify-between gap-2.5 mb-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor.iconBg}`}>
                                {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 16 })}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${typeColor.bg} ${typeColor.text} ${typeColor.border} truncate`}>
                                {getTypeName(req.type)}
                            </span>
                        </div>
                        <div className="shrink-0">
                            <StatusBadge status={req.status} />
                        </div>
                    </div>

                    {/* Employee Profile */}
                    <div className="flex items-center gap-3 py-2 border-t border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {req.employee_name}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                                <span className="font-semibold text-slate-600">{req.employee_id}</span>
                                {req.department && (
                                    <>
                                        <span className="text-slate-300">•</span>
                                        <span className="truncate">{req.department}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Submission Meta */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 pb-2.5 border-b border-slate-100">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">Submitted on <strong className="text-slate-600 font-semibold">{formattedDate}</strong></span>
                    </div>

                    {/* Metadata attributes (Uniform 2-row layout across ALL request types) */}
                    <div className="space-y-1.5 mb-3.5 min-h-[64px] flex flex-col justify-center">
                        {detailRows.map((row, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-100/90 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{row.label}</span>
                                <span className="font-semibold text-slate-800 truncate text-right ml-2 max-w-[190px]" title={row.value}>
                                    {row.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Actions Row - Pinned to bottom */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-auto">
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                disabled={!!acting}
                                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all disabled:opacity-50"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                disabled={!!acting}
                                className="flex-[1.5] py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                            >
                                {acting === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Approve
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : req.id)}
                            className="w-full py-2 bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-all border border-slate-200/90 flex items-center justify-center gap-1.5"
                        >
                            View Details <ExternalLink size={12} className="text-slate-400" />
                        </button>
                    )}
                </div>

                {isExpanded && createPortal(
                    <ApprovalDetailModal
                        req={req}
                        activeTab={activeTab}
                        acting={acting}
                        getTypeIcon={getTypeIcon}
                        getTypeName={getTypeName}
                        handleAction={handleAction}
                        onClose={() => setExpandedId(null)}
                        formattedDate={formattedDate}
                    />,
                    document.body
                )}
            </div>
        );
    }

    // ── 3. LIST VIEW (Spacious Full-Width Row) ──
    return (
        <div className={`bg-white border rounded-xl p-4 transition-all shadow-xs hover:shadow-md
            ${isExpanded ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200/90 hover:border-slate-300'}`}
        >
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : req.id)}
            >
                {/* Left: User & Request info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                        {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                                {req.employee_name}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${typeColor.bg} ${typeColor.text} ${typeColor.border} whitespace-nowrap`}>
                                {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 12 })}
                                <span>{getTypeName(req.type)}</span>
                            </span>
                            {activeTab === 'history' && <StatusBadge status={req.status} />}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {req.employee_id}
                            </span>
                            {req.department && (
                                <span className="text-slate-500">{req.department}</span>
                            )}
                            <span className="flex items-center gap-1 text-slate-400 whitespace-nowrap">
                                <Calendar size={12} />
                                {formattedDate}
                            </span>
                            {req.type === 'password_reset' && req.metadata?.reason && (
                                <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md font-medium truncate max-w-[320px]">
                                    Reason: &quot;{req.metadata.reason}&quot;
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 sm:self-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                disabled={!!acting}
                                className="px-3.5 py-2 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                                <XCircle size={14} />
                                Reject
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                disabled={!!acting}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                            >
                                {acting === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                Approve
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <StatusBadge status={req.status} />
                            <button
                                onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && createPortal(
                <ApprovalDetailModal
                    req={req}
                    activeTab={activeTab}
                    acting={acting}
                    getTypeIcon={getTypeIcon}
                    getTypeName={getTypeName}
                    handleAction={handleAction}
                    onClose={() => setExpandedId(null)}
                    formattedDate={formattedDate}
                />,
                document.body
            )}
        </div>
    );
};

// ── Shared Detail Modal ──
interface ModalProps {
    req: BaseApprovalRequest;
    activeTab: ApprovalStatus | 'history' | 'mine';
    acting: string | null;
    getTypeIcon: (type: string) => React.ReactNode;
    getTypeName: (type: string) => string;
    handleAction: (id: string, action: 'approve' | 'reject', type: string) => void;
    onClose: () => void;
    formattedDate: string;
}

const ApprovalDetailModal: React.FC<ModalProps> = ({
    req, activeTab, acting, getTypeIcon, getTypeName, handleAction, onClose, formattedDate
}) => {
    const typeColor = getTypeColor(req.type);
    const initials = (req.employee_name || 'U')
        .split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

            <div
                className="relative bg-white border border-slate-200/80 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${typeColor.iconBg}`}>
                            {React.cloneElement(getTypeIcon(req.type) as React.ReactElement, { size: 20 })}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">{req.employee_name}</h3>
                                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
                                    {getTypeName(req.type)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">ID: {req.employee_id} {req.department ? `• ${req.department}` : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Meta info banner */}
                <div className="flex items-center justify-between px-6 py-3 bg-indigo-50/40 border-b border-indigo-100/50 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Calendar size={13} className="text-indigo-600" /> Submitted: <strong>{formattedDate}</strong>
                    </span>
                    {activeTab === 'history' && <StatusBadge status={req.status} />}
                </div>

                {/* Metadata details */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Request Details</h5>
                    
                    {req.type === 'password_reset' ? (
                        <div className="space-y-4">
                            {/* Stated Reason Card */}
                            <div className="p-4 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 border border-amber-200/90 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5 text-amber-900 text-[11px] font-black uppercase tracking-wider">
                                        <HelpCircle size={15} className="text-amber-600" />
                                        <span>Stated Reason for Password Reset</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200/60">
                                        Verification Note
                                    </span>
                                </div>
                                <div className="p-3.5 bg-white rounded-xl border border-amber-200/60 shadow-2xs">
                                    <p className="text-[13px] font-semibold text-slate-800 italic leading-relaxed">
                                        &ldquo;{req.metadata?.reason || 'User requested password reset from sign-in screen.'}&rdquo;
                                    </p>
                                </div>
                            </div>

                            {/* Account Details Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        Account Holder
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {req.employee_name || req.metadata?.name || 'Staff Member'}
                                    </p>
                                </div>
                                <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        Registered Email
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {req.metadata?.email || '—'}
                                    </p>
                                </div>
                                <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        Department
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {req.department || req.metadata?.department || 'Operations'}
                                    </p>
                                </div>
                                <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        Requested Timestamp
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 truncate">
                                        {req.metadata?.requested_at 
                                            ? new Date(req.metadata.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                                            : formattedDate}
                                    </p>
                                </div>
                            </div>

                            {/* Administrative Advisory */}
                            <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
                                <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-slate-600 leading-relaxed">
                                    <p className="font-bold text-slate-800">Security Gate Policy</p>
                                    <p className="mt-0.5 text-slate-500">
                                        Approving will permit this user to set a new password on their sign-in screen. Rejecting keeps the existing password active.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : req.metadata && Object.keys(req.metadata).length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(req.metadata)
                                .filter(([k, v]) => v !== null && v !== '' && typeof v !== 'object' && !['reset_token', 'token', 'password', 'hashed_password', 'salt'].includes(k.toLowerCase()))
                                .map(([k, v]: [string, any]) => (
                                <div key={k} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/60">
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        {k.replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-sm font-bold text-slate-800 break-words">
                                        {formatProperValue(k, v)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 rounded-xl">
                            No additional metadata provided for this request.
                        </div>
                    )}
                </div>

                {/* Actions footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    {activeTab === 'pending' ? (
                        <>
                            <button
                                onClick={() => handleAction(req.id, 'reject', req.type)}
                                disabled={!!acting}
                                className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all disabled:opacity-50"
                            >
                                Reject Request
                            </button>
                            <button
                                onClick={() => handleAction(req.id, 'approve', req.type)}
                                disabled={!!acting}
                                className="flex-[1.4] py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                            >
                                {acting === req.id
                                    ? <><Loader2 size={14} className="animate-spin" /> Processing...</>
                                    : <><CheckCircle2 size={14} /> Approve Request</>
                                }
                            </button>
                        </>
                    ) : (
                        <div className="w-full flex items-center justify-between">
                            <StatusBadge status={req.status} />
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ApprovalCard;
