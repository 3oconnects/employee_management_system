import React, { useState, useEffect } from 'react';
import { Building2, Loader2, Users, Search } from 'lucide-react';
import api from '../../../../services/api';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

const DeptDirectoryWidget: React.FC = () => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState<string>('');

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/employees', { params: { limit: 500 } });
                setEmployees(data.items || data || []);
            } catch { setEmployees([]); }
            finally { setLoading(false); }
        })();
    }, []);

    const depts = [...new Set(employees.map(e => e.department_name || e.department || 'Unassigned'))].sort();
    const filtered = employees.filter(e => {
        const dept = e.department_name || e.department || 'Unassigned';
        const matchDept = !filterDept || dept === filterDept;
        const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.position?.toLowerCase().includes(search.toLowerCase());
        return matchDept && matchSearch;
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center justify-center">
                        <Building2 size={16} className="text-pink-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Department Directory</h3>
                        <p className="text-[11px] text-slate-400">{employees.length} employees across {depts.length} departments</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                    <Search size={12} className="text-slate-400"/>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search people…" className="bg-transparent text-[11px] outline-none w-36 text-slate-700 placeholder:text-slate-300"/>
                </div>
                <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                    className="text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-slate-600">
                    <option value="">All Departments</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} results</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-indigo-400 mr-2"/>
                    <p className="text-[12px] text-slate-400">Loading directory…</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
                    {filtered.slice(0, 60).map((e, i) => {
                        const initials = e.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || '??';
                        const color = COLORS[i % COLORS.length];
                        return (
                            <div key={e.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                                <div className="w-9 h-9 rounded-xl text-[11px] font-bold text-white flex items-center justify-center flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}>
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-bold text-slate-800 truncate">{e.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{e.position || 'Employee'} · {e.department_name || e.department || '—'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DeptDirectoryWidget;
