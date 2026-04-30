import React, { useState, useEffect } from 'react';
import { 
    ChevronRight, ChevronDown, Users, Layers, Search, 
    Maximize2, Network, Zap, Building2, User,
    LayoutDashboard, LayoutList, ArrowRight
} from 'lucide-react';
import api from '../../../services/api';
import { LoadingSpinner, toast } from '../../../components/ui';

interface TreeNodeProps {
    node: any;
    depth: number;
    onView: (node: any) => void;
    layout: 'vertical' | 'horizontal';
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, onView, layout }) => {
    const [isExpanded, setIsExpanded] = useState(depth < 1);
    const hasChildren = node.children && node.children.length > 0;

    if (layout === 'horizontal') {
        return (
            <div className="flex items-start">
                <div className="flex flex-col items-center">
                    {/* Node Card */}
                    <div 
                        className={`w-64 p-4 rounded-2xl border transition-all cursor-pointer group relative shadow-sm ${
                            isExpanded ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0 ${
                                node.entity_type === 'department' 
                                    ? 'bg-slate-900 text-white' 
                                    : node.entity_type === 'team'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                                {node.entity_type === 'department' ? <Building2 size={18} /> : 
                                 node.entity_type === 'team' ? <Layers size={18} /> : <User size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[13px] font-black text-slate-900 truncate tracking-tight">{node.name}</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                    {node.entity_type === 'employee' ? node.position || 'Personnel' : node.entity_type}
                                </p>
                            </div>
                            {hasChildren && (
                                <div className={`p-1 rounded-md transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {isExpanded ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                </div>
                            )}
                        </div>
                        
                        {node.owner_name && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User size={10} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500">{node.owner_name}</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">OWNER</span>
                            </div>
                        )}
                    </div>

                    {/* Vertical Connector Line to Children (only in vertical, but here we need horizontal) */}
                    {isExpanded && hasChildren && (
                        <div className="w-px h-8 bg-slate-200" />
                    )}
                </div>

                {/* Horizontal Connector and Children Container */}
                {isExpanded && hasChildren && (
                    <div className="flex items-start">
                        <div className="w-12 h-px bg-slate-200 mt-[32px]" />
                        <div className="flex flex-col gap-4">
                            {node.children.map((child: any) => (
                                <TreeNode key={child.id} node={child} depth={depth + 1} onView={onView} layout={layout} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Vertical View (Existing)
    return (
        <div className="relative">
            {depth > 0 && (
                <div className="absolute left-[-20px] top-[-20px] bottom-0 w-[2px] bg-slate-100" />
            )}
            
            <div 
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group relative ${
                    isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50'
                }`}
                style={{ marginLeft: `${depth * 32}px` }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {depth > 0 && (
                    <div className="absolute left-[-20px] top-1/2 w-5 h-[2px] bg-slate-100" />
                )}

                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {hasChildren ? (
                        <div className={`p-1 rounded-md transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </div>
                    ) : (
                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                    )}
                </div>

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                    node.entity_type === 'department' 
                        ? 'bg-slate-900 text-white' 
                        : node.entity_type === 'team'
                            ? 'bg-white border border-slate-200 text-indigo-500'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                    {node.entity_type === 'department' ? <Building2 size={16} /> : 
                     node.entity_type === 'team' ? <Layers size={16} /> : <User size={16} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[13px] font-black tracking-tight truncate ${
                            node.entity_type === 'department' ? 'text-slate-900' : 'text-slate-700'
                        }`}>
                            {node.name}
                        </span>
                        {node.owner_name && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md">
                                <User size={10} className="text-slate-400" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{node.owner_name.split(' ')[0]}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            node.entity_type === 'department' 
                                ? 'bg-indigo-50 text-indigo-600' 
                                : node.entity_type === 'team'
                                    ? 'bg-slate-50 text-slate-400'
                                    : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            {node.entity_type === 'employee' ? node.position || 'Personnel' : node.entity_type}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="text-[9px] font-bold text-slate-400">ID: {node.entity_id || node.id}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {node.entity_type !== 'employee' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onView(node); }}
                            className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                            <Maximize2 size={12} />
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-1 relative">
                    {node.children.map((child: any) => (
                        <TreeNode key={child.id} node={child} depth={depth + 1} onView={onView} layout={layout} />
                    ))}
                </div>
            )}
        </div>
    );
};

const OrganizationTree: React.FC<{ onNodeClick: (node: any) => void }> = ({ onNodeClick }) => {
    const [tree, setTree] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');

    const fetchTree = async () => {
        setLoading(true);
        try {
            const res = await api.get('/governance/tree');
            setTree(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load structural graph');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTree();
    }, []);

    const filteredTree = tree.filter(node => 
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (node.children && node.children.some((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const handleSync = async () => {
        try {
            await api.post('/governance/sync');
            toast.success('Structural intelligence synchronized');
            fetchTree();
        } catch (err) {
            toast.error('Failed to synchronize blueprint');
        }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="text-indigo-600 animate-spin" />
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mapping Recursive Graph...</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header / Utility Rail */}
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h2 className="text-[18px] font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Network size={22} className="text-indigo-600" /> Structural Intelligence Graph
                    </h2>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Recursive Hierarchy & Cross-Functional Governance</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Layout Switcher */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <button 
                            onClick={() => setLayout('vertical')}
                            className={`p-2 rounded-lg transition-all ${layout === 'vertical' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vertical List"
                        >
                            <LayoutList size={16} />
                        </button>
                        <button 
                            onClick={() => setLayout('horizontal')}
                            className={`p-2 rounded-lg transition-all ${layout === 'horizontal' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Horizontal Map"
                        >
                            <LayoutDashboard size={16} />
                        </button>
                    </div>

                    <div className="w-px h-8 bg-slate-100 mx-2" />

                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-slate-900" /> Division
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" /> Squad
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Personnel
                        </div>
                    </div>
                    <div className="w-px h-8 bg-slate-100 mx-2" />
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search structural nodes..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Tree Viewport */}
            <div className={`flex-1 overflow-auto p-8 custom-scrollbar ${layout === 'horizontal' ? 'bg-slate-50/30' : ''}`}>
                {filteredTree.length > 0 ? (
                    <div className={layout === 'vertical' ? 'max-w-4xl space-y-2' : 'flex flex-col gap-12'}>
                        {filteredTree.map(node => (
                            <TreeNode 
                                key={node.id} 
                                node={node} 
                                depth={0} 
                                onView={onNodeClick} 
                                layout={layout} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-20">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6">
                            <Zap size={40} />
                        </div>
                        <h3 className="text-[18px] font-black text-slate-900">No Nodes Discovered</h3>
                        <p className="text-[13px] text-slate-400 font-medium mt-1.5 max-w-xs">The structural graph is currently dormant. Initialize departments or squads to populate the map.</p>
                        <button 
                            onClick={handleSync}
                            className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl"
                        >
                            Sync Blueprint
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Layers size={14} /> Total Nodes: <span className="text-slate-900">{tree.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Users size={14} /> View Mode: <span className="text-slate-900 uppercase">{layout}</span>
                    </div>
                </div>
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    Structural Synchronization Active
                </div>
            </div>
        </div>
    );
};

const Loader2 = ({ size, className }: { size: number, className: string }) => (
    <div className={className} style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" className="w-full h-full animate-spin">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
        </svg>
    </div>
);

export default OrganizationTree;
