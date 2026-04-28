import React, { useState } from 'react';
import { FileCheck, Download, Eye, Search, Shield, FileText, BookOpen } from 'lucide-react';

const MOCK_POLICIES = [
    { id: 1, title: 'Leave & Attendance Policy',    category: 'HR',         version: 'v3.1', updated: '2026-03-15', mandatory: true },
    { id: 2, title: 'Anti-Harassment Policy',        category: 'Compliance', version: 'v2.0', updated: '2026-01-10', mandatory: true },
    { id: 3, title: 'Remote Work Guidelines',        category: 'Operations', version: 'v1.4', updated: '2026-02-20', mandatory: false },
    { id: 4, title: 'Data Protection & Privacy',     category: 'Security',   version: 'v2.2', updated: '2025-11-05', mandatory: true },
    { id: 5, title: 'Travel & Reimbursement Policy', category: 'Finance',    version: 'v1.8', updated: '2026-04-01', mandatory: false },
    { id: 6, title: 'Code of Conduct',               category: 'Compliance', version: 'v4.0', updated: '2026-01-01', mandatory: true },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
    HR:         { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
    Compliance: { bg: 'bg-rose-50',    text: 'text-rose-600' },
    Operations: { bg: 'bg-amber-50',   text: 'text-amber-600' },
    Security:   { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    Finance:    { bg: 'bg-violet-50',  text: 'text-violet-600' },
};

const PoliciesWidget: React.FC = () => {
    const [search, setSearch] = useState('');
    const filtered = MOCK_POLICIES.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
                        <BookOpen size={16} className="text-sky-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Company Policies</h3>
                        <p className="text-[11px] text-slate-400">{MOCK_POLICIES.length} policies published</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Search size={12} className="text-slate-400"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search policies…" className="bg-transparent text-[11px] outline-none w-32 text-slate-700 placeholder:text-slate-300"/>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map(p => {
                    const cat = CAT_COLORS[p.category] || CAT_COLORS.HR;
                    return (
                        <div key={p.id} className="group bg-white rounded-xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 ${cat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <FileText size={15} className={cat.text}/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{p.title}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cat.bg} ${cat.text}`}>{p.category}</span>
                                        <span className="text-[10px] text-slate-400">{p.version}</span>
                                        {p.mandatory && (
                                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-500">
                                                <Shield size={8}/> Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">Updated {new Date(p.updated).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PoliciesWidget;
