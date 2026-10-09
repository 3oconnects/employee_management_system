import React from 'react';
import { 
    User as UserIcon, 
    Mail, 
    Phone, 
    Calendar, 
    Briefcase, 
    Building2, 
    UserCheck, 
    Eye, 
    Edit2, 
    Send, 
    CheckCircle2, 
    Clock, 
    ShieldAlert,
    XCircle,
    Sparkles
} from 'lucide-react';

interface CandidateTableProps {
    candidates: any[];
    loading: boolean;
    onEdit: (c: any) => void;
    onAcceptOffer?: (c: any) => void;
    onConfirmHire?: (c: any) => void;
    onResendOffer?: (c: any) => void;
    onDeclineOffer?: (c: any) => void;
    searchQuery?: string;
    onClearSearch?: () => void;
}

const fmtId = (id: string | number) => {
    if (!id) return 'N/A';
    const str = String(id);
    if (str.startsWith('EMP-')) return str;
    if (str.startsWith('EMP')) return `EMP-${str.slice(3)}`;
    return `EMP-${str.slice(0, 6).toUpperCase()}`;
};

export const CandidateTable: React.FC<CandidateTableProps> = ({ 
    candidates, 
    loading, 
    onEdit, 
    onAcceptOffer,
    onConfirmHire,
    onResendOffer,
    onDeclineOffer,
    searchQuery, 
    onClearSearch 
}) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold">
                        <tr>
                            <th className="px-5 py-3.5">Candidate Details</th>
                            <th className="px-5 py-3.5">Contact & Emails</th>
                            <th className="px-5 py-3.5">Department</th>
                            <th className="px-5 py-3.5">Job Title & Type</th>
                            <th className="px-5 py-3.5">Joining Date</th>
                            <th className="px-5 py-3.5">Reporting Manager</th>
                            <th className="px-5 py-3.5">Pipeline Status</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-24 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-xs font-medium text-slate-500">Loading candidate onboarding records…</p>
                                    </div>
                                </td>
                            </tr>
                        ) : candidates.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-20 text-center">
                                    {searchQuery ? (
                                        <div className="flex flex-col items-center max-w-sm mx-auto text-slate-500">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2.5">
                                                <UserIcon size={22} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">No candidates found</p>
                                            <p className="text-xs text-slate-500 mt-1 mb-3">
                                                No candidates match &quot;{searchQuery}&quot;. Try adjusting your keywords.
                                            </p>
                                            {onClearSearch && (
                                                <button
                                                    onClick={onClearSearch}
                                                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mb-2.5">
                                                <UserIcon size={24} />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-800">No Candidates in Pipeline</p>
                                            <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                                Candidates created will be listed here. They will move from Offer Sent &rarr; Offer Accepted &rarr; Confirmed & Hired.
                                            </p>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            candidates.map((c: any) => {
                                const initials = c.name 
                                    ? c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                    : 'EM';
                                const formattedJoinDate = c.join_date 
                                    ? new Date(c.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : 'Not set';

                                const personalEmail = c.personal_email || c.personalEmail;
                                const isOfferSent = c.status === 'offer_sent' || c.status === 'onboarding';
                                const isOfferAccepted = c.status === 'offer_accepted';
                                const isActive = c.status === 'active';
                                const isDeclined = c.status === 'offer_declined';

                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Candidate Details */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                                                    isActive 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : isOfferAccepted
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900 block">{c.name}</span>
                                                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{fmtId(c.id)}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact & Emails */}
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                {personalEmail && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                        <Mail size={12} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[170px]" title={personalEmail}>{personalEmail}</span>
                                                        <span className="text-[9px] px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded font-semibold shrink-0">Personal</span>
                                                    </div>
                                                )}
                                                {c.email && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                        <Mail size={11} className="text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[170px]" title={c.email}>{c.email}</span>
                                                        <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded font-semibold shrink-0">Work</span>
                                                    </div>
                                                )}
                                                {c.phone && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                        <Phone size={11} className="text-slate-400 shrink-0" />
                                                        <span>{c.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Department */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-700">
                                                <Building2 size={13} className="text-slate-400 shrink-0" />
                                                <span className="font-medium">{c.department_name || c.department || 'Unassigned'}</span>
                                            </div>
                                        </td>

                                        {/* Job Title & Type */}
                                        <td className="px-5 py-4">
                                            <div className="space-y-1">
                                                <span className="font-medium text-slate-800 block">{c.position || '—'}</span>
                                                <span className="inline-flex px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded capitalize">
                                                    {(c.employment_type || 'full_time').replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Joining Date */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <Calendar size={12} className="text-slate-400 shrink-0" />
                                                <span>{formattedJoinDate}</span>
                                            </div>
                                        </td>

                                        {/* Reporting Manager */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <UserCheck size={13} className="text-slate-400 shrink-0" />
                                                <span>{c.manager_name || 'Pending'}</span>
                                            </div>
                                        </td>

                                        {/* Pipeline Status */}
                                        <td className="px-5 py-4">
                                            {isOfferSent && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Offer Sent
                                                    </span>
                                                    <p className="text-[10px] text-amber-600/80 font-medium mt-0.5">Pending Acceptance</p>
                                                </div>
                                            )}

                                            {isOfferAccepted && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                        Offer Accepted
                                                    </span>
                                                    <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                                        {c.offer_accepted_date ? (
                                                            <>Accepted: {new Date(c.offer_accepted_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{c.offer_accepted_via === 'email' ? ' (Email)' : ''}</>
                                                        ) : c.offer_accepted_at ? (
                                                            <>Accepted: {new Date(c.offer_accepted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{c.offer_accepted_via === 'email' ? ' (Email)' : ''}</>
                                                        ) : (
                                                            'Awaiting HR Confirmation'
                                                        )}
                                                    </p>
                                                </div>
                                            )}

                                            {isActive && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Confirmed & Hired
                                                    </span>
                                                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Credentials Dispatched</p>
                                                </div>
                                            )}

                                            {isDeclined && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                        Offer Declined
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {/* Stage 1: Offer Sent Actions */}
                                                {isOfferSent && (
                                                    <>
                                                        <button 
                                                            onClick={() => onAcceptOffer?.(c)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 text-xs font-semibold rounded-lg transition-all shadow-xs"
                                                            title="Candidate has accepted the offer letter"
                                                        >
                                                            <CheckCircle2 size={13} className="text-blue-600" />
                                                            Accept Offer
                                                        </button>
                                                        <button 
                                                            onClick={() => onResendOffer?.(c)}
                                                            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg transition-all shadow-xs"
                                                            title="Resend offer letter email"
                                                        >
                                                            <Send size={12} />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Stage 2: Offer Accepted — Waiting for HR Confirmation */}
                                                {isOfferAccepted && (
                                                    <button 
                                                        onClick={() => onConfirmHire?.(c)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all shadow-sm shadow-emerald-600/20"
                                                        title="Confirm candidate hire and dispatch official login credentials"
                                                    >
                                                        <Sparkles size={13} />
                                                        Confirm & Hire
                                                    </button>
                                                )}

                                                {/* Edit / Review Details */}
                                                <button 
                                                    onClick={() => onEdit(c)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-xs"
                                                    title="Review candidate profile details"
                                                >
                                                    <Edit2 size={12} className="text-slate-500" />
                                                    Review
                                                </button>
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
