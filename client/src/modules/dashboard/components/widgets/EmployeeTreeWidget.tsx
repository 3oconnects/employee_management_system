import React, { useState, useEffect } from 'react';
import { GitBranch, Loader2, Users, ChevronDown, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../../../../services/api';
import { buildOrgTree, filterOrgTree, OrgNode } from './orgTree';
import { TreeForest, RenderState } from './OrgTreeLayout';

const DEPTH_COLORS = [
    { bg: 'from-indigo-600 to-violet-700',  ring: 'ring-indigo-200' },
    { bg: 'from-violet-500 to-purple-600',  ring: 'ring-violet-200' },
    { bg: 'from-emerald-500 to-teal-600',   ring: 'ring-emerald-200' },
    { bg: 'from-amber-500 to-orange-600',   ring: 'ring-amber-200' },
    { bg: 'from-sky-500 to-blue-600',       ring: 'ring-sky-200' },
    { bg: 'from-pink-500 to-rose-600',      ring: 'ring-pink-200' },
];

/* ── One person's card ──────────────────────────────── */
const renderPerson = (node: OrgNode, { open, toggle, hasChildren, depth }: RenderState) => {
    const style = DEPTH_COLORS[depth % DEPTH_COLORS.length];
    const initials = node.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??';
    return (
        <div className="relative">
            <button
                onClick={toggle}
                className={`relative flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm
                    hover:shadow-md hover:border-indigo-200 transition-all w-[230px] text-left
                    ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.bg} flex items-center justify-center text-[12px] font-black text-white flex-shrink-0 ring-2 ${style.ring}`}>
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{node.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{node.position || 'Employee'}</p>
                    {node.department_name && (
                        <span className="inline-block mt-1 max-w-full truncate text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 border border-slate-100 tracking-wider">
                            {node.department_name}
                        </span>
                    )}
                </div>
                {hasChildren && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                        ${open ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                        {open ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                    </div>
                )}
            </button>
            {hasChildren && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-sm z-10 whitespace-nowrap">
                    {node.children.length} {node.children.length === 1 ? 'report' : 'reports'}
                </span>
            )}
        </div>
    );
};

/* ── Main Widget ────────────────────────────────────── */
const EmployeeTreeWidget: React.FC = () => {
    const [tree, setTree] = useState<OrgNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [zoom, setZoom] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/employees', { params: { limit: 500 } });
                const items: any[] = data.items || data || [];
                setTotalCount(items.length);
                
                setTree(buildOrgTree(items));
            } catch { setTree([]); }
            finally { setLoading(false); }
        })();
    }, []);

    const displayTree = filterOrgTree(tree, search);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <GitBranch size={16} className="text-emerald-600"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Employee Org Chart</h3>
                        <p className="text-[11px] text-slate-400">{totalCount} employees · Reporting hierarchy</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <Search size={12} className="text-slate-400"/>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search people…"
                            className="bg-transparent text-[11px] outline-none w-28 text-slate-700 placeholder:text-slate-300"/>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-1 py-1">
                        <button onClick={() => setZoom(z => Math.max(50, z - 10))}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 transition-all">
                            <ZoomOut size={12}/>
                        </button>
                        <span className="text-[10px] font-bold text-slate-500 w-8 text-center">{zoom}%</span>
                        <button onClick={() => setZoom(z => Math.min(150, z + 10))}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 transition-all">
                            <ZoomIn size={12}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Org chart area */}
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 overflow-auto max-h-[600px] p-8"
                style={{ minHeight: '300px' }}>
                <div className="transition-transform origin-top-left"
                    style={{ transform: `scale(${zoom / 100})`, width: 'max-content', minWidth: '100%' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={20} className="animate-spin text-indigo-400 mr-2"/>
                            <p className="text-[12px] text-slate-400 font-semibold">Building org chart…</p>
                        </div>
                    ) : displayTree.length === 0 ? (
                        <div className="text-center py-16">
                            <Users size={32} className="mx-auto text-slate-200 mb-3"/>
                            <p className="text-[13px] font-bold text-slate-400">{search ? 'No matches found' : 'No employee data'}</p>
                        </div>
                    ) : (
                        <TreeForest key={search} roots={displayTree} render={renderPerson}/>
                    )}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
                {['CEO / Head', 'Directors', 'Managers', 'Team Leads', 'Engineers', 'Individual'].map((l, i) => (
                    <div key={l} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded bg-gradient-to-br ${DEPTH_COLORS[i % DEPTH_COLORS.length].bg}`}/>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{l}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeeTreeWidget;
