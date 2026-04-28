import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Search, UserCheck, ChevronDown } from 'lucide-react';
import api from '../../../../services/api';

interface EmpOption { id: string; user_id: number; name: string; position: string; department: string; }

const COLORS: Record<string,string> = {A:'#6366f1',B:'#8b5cf6',C:'#ec4899',D:'#f59e0b',E:'#10b981',F:'#3b82f6',G:'#ef4444',H:'#14b8a6',I:'#f97316',J:'#84cc16',K:'#06b6d4',L:'#a855f7',M:'#e11d48',N:'#0ea5e9',O:'#22c55e',P:'#d946ef',Q:'#fb923c',R:'#64748b',S:'#6366f1',T:'#8b5cf6',U:'#ec4899',V:'#10b981',W:'#3b82f6',X:'#f59e0b',Y:'#14b8a6',Z:'#ef4444'};
const clr = (n: string) => COLORS[(n?.[0]??'U').toUpperCase()]??'#6366f1';
const ini = (n: string) => n?.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)||'??';

interface Props {
    value: string; displayName: string;
    onChange: (id: string, name: string) => void;
}

const ManagerPicker: React.FC<Props> = ({ value, displayName, onChange }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [employees, setEmployees] = useState<EmpOption[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const fetch = async (q: string) => {
        setLoading(true);
        try {
            const { data } = await api.get('/employees', { params: { search: q, limit: 20 } });
            setEmployees(data.items || []);
        } catch {} finally { setLoading(false); }
    };

    return (
        <div className="relative" ref={ref}>
            <div onClick={() => { if(!open) { setOpen(true); fetch(search); } }}
                className={`w-full flex items-center gap-2 bg-white border rounded-xl px-3.5 py-2.5 text-[13px] transition-all cursor-pointer
                    ${open ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                {value ? (
                    <>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{backgroundColor: clr(displayName)}}>{ini(displayName)}</div>
                        <span className="font-semibold text-slate-800 flex-1 text-left truncate">{displayName}</span>
                        <button type="button" onClick={e=>{e.stopPropagation();onChange('','');setSearch('');}}
                            className="text-slate-300 hover:text-slate-500 flex-shrink-0 transition-colors p-1 hover:bg-slate-50 rounded-md"><X size={12}/></button>
                    </>
                ) : (
                    <>
                        <UserCheck size={14} className="text-slate-300 flex-shrink-0"/>
                        <span className="text-slate-300 flex-1 text-left">Search and select reporting manager…</span>
                        <ChevronDown size={13} className={`text-slate-300 transition-transform ${open?'rotate-180':''}`}/>
                    </>
                )}
            </div>

            {open && (
                <div className="absolute z-50 top-full mt-1.5 w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"/>
                            <input autoFocus type="text" placeholder="Search by name…" value={search}
                                onChange={e=>{setSearch(e.target.value);fetch(e.target.value);}}
                                className="w-full bg-slate-50 rounded-xl pl-8 pr-3 py-2 text-[12px] outline-none focus:bg-white border border-slate-100 focus:border-indigo-300 transition-all"/>
                        </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-6"><Loader2 size={16} className="animate-spin text-indigo-400"/></div>
                        ) : employees.filter(e => e.user_id).length === 0 ? (
                            <div className="text-center py-6 text-[11px] text-slate-400">No employees found</div>
                        ) : employees.filter(e => e.user_id).map(emp => (
                            <button key={emp.id} type="button"
                                onClick={()=>{onChange(emp.user_id.toString(), emp.name);setOpen(false);setSearch('');}}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 transition-all text-left ${value===emp.user_id.toString()?'bg-indigo-50':''}`}>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                    style={{backgroundColor:clr(emp.name)}}>{ini(emp.name)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[12px] font-bold truncate ${value===emp.user_id.toString()?'text-indigo-700':'text-slate-800'}`}>{emp.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{emp.position||'Employee'} · {emp.department||'—'}</p>
                                </div>
                                {value===emp.user_id.toString()&&<UserCheck size={13} className="text-indigo-500 flex-shrink-0"/>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerPicker;
