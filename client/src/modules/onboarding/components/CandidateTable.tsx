import React from 'react';
import { Eye, SlidersHorizontal, ArrowUpDown, User as UserIcon, Mail, Phone, Calendar, Briefcase, Building2, Shield, Activity, ArrowUpRight } from 'lucide-react';

interface CandidateTableProps {
    candidates: any[];
    loading: boolean;
    onEdit: (c: any) => void;
}

const fmtId = (id: string) => {
    if (!id) return 'N/A';
    if (id.startsWith('EMP-')) return id;
    if (id.startsWith('EMP')) return `EMP-${id.slice(3)}`;
    return `EMP-${id.slice(0, 6).toUpperCase()}`;
};

export const CandidateTable: React.FC<CandidateTableProps> = ({ candidates, loading, onEdit }) => {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto no-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-slate-50/50 sticky top-0 border-b border-slate-100 z-10">
                        <tr>
                            <th className="p-4 w-12 text-center border-r border-slate-100"><SlidersHorizontal size={12} className="text-slate-400 mx-auto" /></th>
                            {[
                                { label: 'Candidate', icon: UserIcon },
                                { label: 'Connectivity', icon: Mail },
                                { label: 'Allocation', icon: Building2 },
                                { label: 'Target Role', icon: Briefcase },
                                { label: 'Sequence', icon: Calendar },
                                { label: 'Audit', icon: Shield },
                                { label: 'Model', icon: Activity },
                                { label: 'Pipeline State', icon: Activity }
                            ].map((header, i) => (
                                <th key={i} className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 group hover:bg-slate-100/50 transition-colors cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <header.icon size={12} className="text-slate-400/50" />
                                            <span>{header.label}</span>
                                        </div>
                                        <ArrowUpDown size={10} className="text-slate-200 group-hover:text-indigo-400 transition-all" />
                                    </div>
                                </th>
                            ))}
                            <th className="px-6 py-4 w-20 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {candidates.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-24 text-center">
                                    <div className="flex flex-col items-center opacity-30">
                                        <UserIcon size={40} className="text-slate-300 mb-4" />
                                        <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">Zero Pipeline</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1"> recruitment funnel offline</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            candidates.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 border-r border-slate-50 text-center">
                                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-200 text-indigo-600 focus:ring-indigo-500/10 shadow-sm" />
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-400 group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all">
                                                {c.name.split(' ').map((n:any)=>n[0]).join('').toUpperCase().slice(0,2)}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors tracking-tight">{c.name}</p>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{fmtId(c.id)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <div className="space-y-0.5">
                                            <p className="text-[12px] font-medium text-slate-600">{c.email}</p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{c.phone || 'NO CONNECT'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <Building2 size={12} className="text-slate-300" />
                                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                                                {c.department_name || c.department || 'UNASSIGNED'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <p className="text-[12px] font-bold text-slate-600 uppercase tracking-tight">{c.position}</p>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <p className="text-[12px] font-medium text-slate-600">
                                            {new Date(c.join_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <Shield size={12} className="text-slate-300" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.manager_name || 'PENDING'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 rounded border border-slate-100">
                                            {c.employment_type?.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 rounded-md border border-amber-100 flex items-center w-fit gap-2">
                                            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => onEdit(c)}
                                                className="px-3 py-1 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Review
                                            </button>
                                            <button className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90">
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
