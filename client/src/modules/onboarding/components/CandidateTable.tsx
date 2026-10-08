import React from 'react';
import { User as UserIcon, Mail, Phone, Calendar, Briefcase, Building2, UserCheck, Eye, Edit2, Plus } from 'lucide-react';

interface CandidateTableProps {
    candidates: any[];
    loading: boolean;
    onEdit: (c: any) => void;
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
    searchQuery, 
    onClearSearch 
}) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 font-semibold">
                        <tr>
                            <th className="px-5 py-3.5">Candidate / Employee</th>
                            <th className="px-5 py-3.5">Contact Details</th>
                            <th className="px-5 py-3.5">Department</th>
                            <th className="px-5 py-3.5">Job Title</th>
                            <th className="px-5 py-3.5">Joining Date</th>
                            <th className="px-5 py-3.5">Reporting Manager</th>
                            <th className="px-5 py-3.5">Employment</th>
                            <th className="px-5 py-3.5">Status</th>
                            <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="py-24 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <div className="w-7 h-7 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                                        <p className="text-xs font-medium text-slate-500">Loading onboarding records…</p>
                                    </div>
                                </td>
                            </tr>
                        ) : candidates.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-20 text-center">
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
                                                New hires added with status &quot;Onboarding&quot; will be listed here for profile completion and verification.
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

                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                                                    {initials}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-slate-900">{c.name}</span>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtId(c.id)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-slate-700">{c.email || '—'}</p>
                                                <p className="text-[11px] text-slate-400">{c.phone || 'No phone'}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-700">
                                                <Building2 size={13} className="text-slate-400 shrink-0" />
                                                <span className="font-medium">{c.department_name || c.department || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="font-medium text-slate-800">{c.position || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-slate-600">{formattedJoinDate}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                                <UserCheck size={13} className="text-slate-400 shrink-0" />
                                                <span>{c.manager_name || 'Pending'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="inline-flex px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 rounded capitalize">
                                                {(c.employment_type || 'full_time').replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                c.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {c.status === 'active' ? 'Active' : 'In Progress'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button 
                                                onClick={() => onEdit(c)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-all shadow-xs"
                                            >
                                                <Edit2 size={12} className="text-slate-500" />
                                                Review
                                            </button>
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
