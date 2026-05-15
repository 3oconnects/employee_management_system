import React, { useState, useEffect } from 'react';
import { Network, Loader2, Users, ChevronDown, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../../../../services/api';

/* ── Types ──────────────────────────────────────────── */
interface DeptData {
    name: string;
    count: number;
    percentage: number;
    head?: { id: string; name: string; position?: string };
    members: { id: string; name: string; position?: string; manager_id?: string }[];
}

const DEPT_COLORS = [
    { grad: 'from-indigo-600 to-violet-700',  ring: 'ring-indigo-200', accent: '#6366f1', light: 'bg-indigo-50' },
    { grad: 'from-violet-500 to-purple-600',  ring: 'ring-violet-200', accent: '#8b5cf6', light: 'bg-violet-50' },
    { grad: 'from-emerald-500 to-teal-600',   ring: 'ring-emerald-200', accent: '#10b981', light: 'bg-emerald-50' },
    { grad: 'from-amber-500 to-orange-600',   ring: 'ring-amber-200',  accent: '#f59e0b', light: 'bg-amber-50' },
    { grad: 'from-sky-500 to-blue-600',       ring: 'ring-sky-200',    accent: '#0ea5e9', light: 'bg-sky-50' },
    { grad: 'from-pink-500 to-rose-600',      ring: 'ring-pink-200',   accent: '#ec4899', light: 'bg-pink-50' },
    { grad: 'from-teal-500 to-cyan-600',      ring: 'ring-teal-200',   accent: '#14b8a6', light: 'bg-teal-50' },
    { grad: 'from-red-500 to-rose-600',       ring: 'ring-red-200',    accent: '#ef4444', light: 'bg-red-50' },
];

const initials = (name?: string) => name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??';

/* ── Department Card (agile style) ──────────────────── */
const DeptCard: React.FC<{ dept: DeptData; colorIdx: number }> = ({ dept, colorIdx }) => {
    const [open, setOpen] = useState(false);
    const c = DEPT_COLORS[colorIdx % DEPT_COLORS.length];

    // Build mini-tree inside department: head → managers → members
    const headId = dept.head?.id;
    const managers = dept.members.filter(m => m.id !== headId && dept.members.some(sub => sub.manager_id === m.id));
    const others = dept.members.filter(m => m.id !== headId && !managers.find(mg => mg.id === m.id));

    return (
        <div className="flex flex-col items-center">
            {/* Department header node */}
            <button onClick={() => setOpen(!open)}
                className="relative bg-white rounded-2xl border-2 shadow-md hover:shadow-lg transition-all min-w-[220px] max-w-[280px] overflow-hidden cursor-pointer group"
                style={{ borderColor: c.accent + '40' }}>
                {/* Color strip */}
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.accent}88)` }}/>
                <div className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center flex-shrink-0`}>
                            <Network size={16} className="text-white"/>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <p className="text-[13px] font-black text-slate-800 truncate">{dept.name}</p>
                            <p className="text-[10px] text-slate-400">{dept.count} members · {dept.percentage}%</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all
                            ${open ? 'bg-indigo-50 text-indigo-600 rotate-0' : 'bg-slate-50 text-slate-400'}`}>
                            {open ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                        </div>
                    </div>

                    {/* Department Head */}
                    {dept.head && (
                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center text-[10px] font-bold text-white ring-2 ${c.ring}`}>
                                {initials(dept.head.name)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-700 truncate">{dept.head.name}</p>
                                <p className="text-[9px] text-slate-400">{dept.head.position || 'Department Head'}</p>
                            </div>
                            <span className="ml-auto text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg text-white flex-shrink-0"
                                style={{ backgroundColor: c.accent }}>
                                Head
                            </span>
                        </div>
                    )}
                </div>
            </button>

            {/* Connector line */}
            {open && dept.members.length > 0 && (
                <div className="w-px h-5" style={{ backgroundColor: c.accent, opacity: 0.2 }}/>
            )}

            {/* Expanded: show internal hierarchy */}
            {open && (
                <div className="relative">
                    {/* Horizontal bar */}
                    {(managers.length + (others.length > 0 ? 1 : 0)) > 1 && (
                        <div className="h-px mx-auto mb-0" style={{
                            backgroundColor: c.accent, opacity: 0.15,
                            width: '80%', marginLeft: '10%'
                        }}/>
                    )}

                    <div className="flex gap-3 flex-wrap justify-center">
                        {/* Managers with their reports */}
                        {managers.map(mgr => {
                            const reports = dept.members.filter(m => m.manager_id === mgr.id && m.id !== mgr.id);
                            return (
                                <div key={mgr.id} className="flex flex-col items-center">
                                    <div className="w-px h-4" style={{ backgroundColor: c.accent, opacity: 0.15 }}/>
                                    <MemberCard name={mgr.name} position={mgr.position} color={c} isManager/>
                                    {reports.length > 0 && (
                                        <>
                                            <div className="w-px h-3" style={{ backgroundColor: c.accent, opacity: 0.1 }}/>
                                            <div className="flex gap-2 flex-wrap justify-center">
                                                {reports.slice(0, 6).map(r => (
                                                    <div key={r.id} className="flex flex-col items-center">
                                                        <div className="w-px h-3" style={{ backgroundColor: c.accent, opacity: 0.1 }}/>
                                                        <MemberCard name={r.name} position={r.position} color={c}/>
                                                    </div>
                                                ))}
                                                {reports.length > 6 && (
                                                    <div className="flex items-end pb-1">
                                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                            +{reports.length - 6} more
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}

                        {/* Unmanaged members */}
                        {others.length > 0 && (
                            <div className="flex flex-col items-center">
                                <div className="w-px h-4" style={{ backgroundColor: c.accent, opacity: 0.15 }}/>
                                <div className="flex gap-2 flex-wrap justify-center max-w-[400px]">
                                    {others.slice(0, 8).map(m => (
                                        <div key={m.id} className="flex flex-col items-center">
                                            <MemberCard name={m.name} position={m.position} color={c}/>
                                        </div>
                                    ))}
                                    {others.length > 8 && (
                                        <div className="flex items-center">
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                +{others.length - 8} more
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Member mini-card ───────────────────────────────── */
const MemberCard: React.FC<{ name: string; position?: string; color: typeof DEPT_COLORS[0]; isManager?: boolean }> = ({ name, position, color, isManager }) => (
    <div className={`flex items-center gap-2 px-3 py-2 bg-white rounded-xl border transition-all hover:shadow-sm min-w-[140px] max-w-[180px]
        ${isManager ? 'border-slate-200 shadow-sm' : 'border-slate-100'}`}>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color.grad} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0
            ${isManager ? `ring-2 ${color.ring}` : ''}`}>
            {initials(name)}
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-700 truncate">{name}</p>
            <p className="text-[8px] text-slate-400 truncate">{position || 'Member'}</p>
        </div>
    </div>
);

/* ── Main Widget ────────────────────────────────────── */
const DeptTreeWidget: React.FC = () => {
    const [depts, setDepts] = useState<DeptData[]>([]);
    const [loading, setLoading] = useState(true);
    const [zoom, setZoom] = useState(100);

    useEffect(() => {
        (async () => {
            try {
                const [dRes, eRes] = await Promise.all([
                    api.get('/reports/departments'),
                    api.get('/employees', { params: { limit: 500 } }),
                ]);
                const departments = dRes.data?.items || dRes.data || [];
                const employees: any[] = eRes.data?.items || eRes.data || [];

                const enriched: DeptData[] = departments.map((d: any) => {
                    const members = employees
                        .filter((e: any) => (e.department_name || e.department) === d.name)
                        .map((e: any) => ({ id: e.id, name: e.name, position: e.position, manager_id: e.manager_id }));

                    // Find department head — person who manages others but has no manager in this dept
                    const memberIds = new Set(members.map(m => m.id));
                    const head = members.find(m =>
                        members.some(sub => sub.manager_id === m.id) &&
                        (!m.manager_id || !memberIds.has(m.manager_id))
                    );

                    return { ...d, members, head: head ? { id: head.id, name: head.name, position: head.position } : undefined };
                });

                setDepts(enriched);
            } catch { setDepts([]); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Network size={16} className="text-amber-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Department Tree</h3>
                        <p className="text-[11px] text-slate-400">{depts.length} departments · Agile hierarchy</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-1 py-1">
                    <button onClick={() => setZoom(z => Math.max(60, z - 10))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 transition-all">
                        <ZoomOut size={12}/>
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 w-8 text-center">{zoom}%</span>
                    <button onClick={() => setZoom(z => Math.min(130, z + 10))}
                        className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 transition-all">
                        <ZoomIn size={12}/>
                    </button>
                </div>
            </div>

            {/* Tree canvas */}
            <div className="bg-gradient-to-br from-slate-50/50 to-white rounded-2xl border border-slate-100 overflow-auto max-h-[600px] p-6"
                style={{ minHeight: '300px' }}>
                <div className="flex flex-wrap gap-6 justify-center transition-transform origin-top"
                    style={{ transform: `scale(${zoom / 100})` }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-16 w-full">
                            <Loader2 size={20} className="animate-spin text-indigo-400 mr-2"/>
                            <p className="text-[12px] text-slate-400 font-semibold">Loading departments…</p>
                        </div>
                    ) : depts.length === 0 ? (
                        <div className="text-center py-16 w-full">
                            <Users size={32} className="mx-auto text-slate-200 mb-3"/>
                            <p className="text-[13px] font-bold text-slate-400">No department data</p>
                        </div>
                    ) : (
                        depts.map((d, i) => <DeptCard key={d.name} dept={d} colorIdx={i}/>)
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeptTreeWidget;
