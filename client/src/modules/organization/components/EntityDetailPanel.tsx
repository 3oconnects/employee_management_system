import React from 'react';
import { createPortal } from 'react-dom';
import { 
    X, Info, Users, Activity, FileText, Globe, 
    ShieldCheck, UserPlus, ExternalLink, ArrowLeft,
    Check, Loader2, Database
} from 'lucide-react';

interface EntityDetailPanelProps {
    viewingItem: { type: 'dept' | 'team' | 'node', item: any } | null;
    resolvedOwnership: any;
    viewMembers: any[];
    loadingMembers: boolean;
    onClose: () => void;
    onManageTeam: () => void;
}

const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
    viewingItem,
    resolvedOwnership,
    viewMembers,
    loadingMembers,
    onClose,
    onManageTeam
}) => {
    if (!viewingItem) return null;

    const { type, item } = viewingItem;
    const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : (item.metadata || {});

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex justify-end">
            <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm animate-in fade-in duration-500" onClick={onClose} />
            <div className="relative w-full max-w-[520px] bg-white shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.1)] h-full overflow-hidden flex flex-col animate-in slide-in-from-right-full duration-700 border-l border-slate-100">
                
                {/* Administrative Header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <button onClick={onClose} className="flex items-center gap-2.5 text-slate-400 hover:text-slate-900 transition-all group">
                        <ArrowLeft size={16} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Blueprint</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${type === 'dept' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {type === 'node' ? item.entity_type : (type === 'dept' ? 'Division' : 'Squad')} Node
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Hero Section */}
                    <div className="p-8 pb-4 space-y-3">
                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Database size={12} className="text-indigo-500" /> Organizational ID: {meta.internal_code || 'UNASSIGNED'}
                        </div>
                        <h2 className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{item.name}</h2>
                        <p className="text-[14px] text-slate-500 font-medium leading-relaxed max-w-md">{item.description || 'Primary structural node within the enterprise ecosystem.'}</p>
                    </div>

                    <div className="px-8 py-6 space-y-8">
                        {/* Governance & Compliance Block */}
                        <section className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-indigo-600" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Command Owner</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-800 truncate max-w-[120px]">{resolvedOwnership?.resolvedOwner?.name || 'Unassigned'}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Primary Authority</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                                <div className="flex items-center gap-2">
                                    <Activity size={14} className="text-emerald-600" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Status</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[13px] font-bold text-slate-800 capitalize">
                                        <div className={`w-2 h-2 rounded-full ${meta.status === 'stealth' ? 'bg-amber-500' : 'bg-emerald-500'} shadow-[0_0_8px_rgba(16,185,129,0.3)]`} />
                                        {meta.status || 'Active'}
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Strategic Priority: <span className="text-indigo-600">{meta.priority || 'Standard'}</span></p>
                                </div>
                            </div>
                        </section>

                        {/* Force Composition (Personnel) */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Force Composition</h3>
                                <button 
                                    onClick={onManageTeam}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                                >
                                    Manage Team
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                {loadingMembers ? (
                                    <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-slate-200" /></div>
                                ) : viewMembers.map(member => (
                                    <div key={member.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-indigo-100 hover:bg-indigo-50/10 transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all font-bold text-[11px]">
                                                {member.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-800">{member.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{member.position}</p>
                                            </div>
                                        </div>
                                        <ExternalLink size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                ))}
                                {viewMembers.length === 0 && !loadingMembers && (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/30">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No active personnel assigned</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Strategic Assets (Resources) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Strategic Assets</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { title: 'Operational Policy Framework', type: 'PDF', icon: <FileText size={14} /> },
                                    { title: 'Structural Architecture Diagram', type: 'SVG', icon: <Activity size={14} /> },
                                    { title: 'Knowledge Base Portal', type: 'URL', icon: <Globe size={14} /> }
                                ].map((file, i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer group flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                                                {file.icon}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-800 mb-0.5">{file.title}</p>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600/60">{file.type} Asset</span>
                                            </div>
                                        </div>
                                        <Check size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Status Rail */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Node Sync</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Protocol 4.0</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                        <Globe size={14} />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EntityDetailPanel;
