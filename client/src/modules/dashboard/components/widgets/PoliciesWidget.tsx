import React, { useState, useEffect } from 'react';
import { FileCheck, Download, Eye, Search, Shield, FileText, BookOpen, Loader2 } from 'lucide-react';
import api from '../../../../services/api';

interface Policy {
    id: string;
    title: string;
    category: string;
    version: string;
    updated: string;
    mandatory: boolean;
    url?: string;
}

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
    HR:         { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
    Compliance: { bg: 'bg-rose-50',    text: 'text-rose-600' },
    Operations: { bg: 'bg-amber-50',   text: 'text-amber-600' },
    Security:   { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    Finance:    { bg: 'bg-violet-50',  text: 'text-violet-600' },
    General:    { bg: 'bg-slate-50',   text: 'text-slate-600' },
};

const PoliciesWidget: React.FC = () => {
    const [search, setSearch] = useState('');
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/settings/config');
            if (data.data?.policies?.list) {
                setPolicies(JSON.parse(data.data.policies.list));
            } else {
                setPolicies([]);
            }
        } catch (err) {
            console.error('Failed to load policies:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicies();
    }, []);

    const filtered = policies.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 size={24} className="text-indigo-600 animate-spin" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Syncing Policies...</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center">
                        <BookOpen size={16} className="text-sky-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Company Policies</h3>
                        <p className="text-[11px] text-slate-400">{policies.length} policies published</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Search size={12} className="text-slate-400"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search policies…" className="bg-transparent text-[11px] outline-none w-32 text-slate-700 placeholder:text-slate-300"/>
                </div>
            </div>

            {policies.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FileText size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-[12px] font-bold text-slate-500">No policies available</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Check back later for updates</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filtered.map(p => {
                        const cat = CAT_COLORS[p.category] || CAT_COLORS.General;
                        return (
                            <div 
                                key={p.id} 
                                onClick={() => p.url && window.open(p.url, '_blank')}
                                className="group bg-white rounded-xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-9 h-9 ${cat.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                        <FileText size={15} className={cat.text}/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">{p.title}</p>
                                            <Download size={12} className="text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                                        </div>
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
            )}
        </div>
    );
};

export default PoliciesWidget;
