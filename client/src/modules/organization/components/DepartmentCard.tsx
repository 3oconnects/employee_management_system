import React from 'react';
import { Layers, ChevronDown, ChevronUp, Plus, Edit2, Trash2, Users, MoreVertical, Activity, ShieldCheck } from 'lucide-react';

interface DepartmentCardProps {
    dept: any;
    teams: any[];
    isExpanded: boolean;
    onToggle: () => void;
    onView: (type: 'dept' | 'team', item: any) => void;
    onAddSquad: (parentId: string) => void;
    onEdit: (type: 'dept' | 'team', item: any) => void;
    onDelete: (type: 'dept' | 'team', item: any) => void;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({
    dept,
    teams,
    isExpanded,
    onToggle,
    onView,
    onAddSquad,
    onEdit,
    onDelete
}) => {
    return (
        <div className={`group bg-white border rounded-2xl transition-all duration-500 overflow-hidden ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-500/10' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
            <div className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/30'}`} onClick={onToggle}>
                <div className="flex items-center gap-4 flex-1">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:scale-105'}`}>
                        <Layers size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-[16px] font-black text-slate-800 tracking-tight">{dept.name}</h3>
                            <span className="px-2 py-0.5 bg-white border border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest rounded-lg shadow-sm">
                                {dept.employee_count} Agents
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1 max-w-xl">{dept.description || 'Primary organizational division managing core enterprise workflows.'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); onView('dept', dept); }} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-600 transition-all">
                            View
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onAddSquad(dept.id.toString()); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm" title="Add Squad">
                            <Plus size={16} />
                        </button>
                        <div className="w-px h-5 bg-slate-100 mx-1" />
                        <button onClick={(e) => { e.stopPropagation(); onEdit('dept', dept); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm">
                            <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete('dept', dept); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shadow-sm">
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-180 shadow-md shadow-indigo-600/20' : 'bg-slate-50 text-slate-400'}`}>
                        <ChevronDown size={16} strokeWidth={3} />
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="flex border-t border-slate-50 bg-slate-50/10 min-h-[180px] animate-in slide-in-from-top-2 duration-500">
                    {/* Side Sidebar for Context */}
                    <div className="w-12 border-r border-slate-50 flex flex-col items-center py-6 gap-4 bg-slate-50/20">
                        <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-300">
                            <Activity size={12} />
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-300">
                            <ShieldCheck size={12} />
                        </div>
                    </div>

                    <div className="flex-1 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subordinate Squads</h4>
                                <div className="h-px w-16 bg-slate-100" />
                            </div>
                            <button 
                                onClick={() => onAddSquad(dept.id.toString())}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-indigo-600 border border-indigo-100 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                            >
                                <Plus size={12} strokeWidth={3} /> Initialize Squad
                            </button>
                        </div>

                        {teams.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {teams.map(team => (
                                    <div key={team.id} className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group/team flex items-center justify-between relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover/team:opacity-5 translate-x-2 group-hover/team:translate-x-0 transition-all">
                                            <Users size={48} />
                                        </div>
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover/team:bg-indigo-600 group-hover/team:text-white transition-all duration-500 shadow-sm">
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-[13px] font-black text-slate-900 leading-tight tracking-tight">{team.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-500" /> {team.employee_count} Members
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/team:opacity-100 transition-all relative z-10 translate-x-2 group-hover/team:translate-x-0">
                                            <button onClick={() => onView('team', team)} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-all shadow-lg">
                                                <MoreVertical size={14} />
                                            </button>
                                            <button onClick={() => onEdit('team', team)} className="w-8 h-8 bg-white border border-slate-100 text-slate-400 rounded-lg flex items-center justify-center hover:text-indigo-600 transition-all shadow-sm">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => onDelete('team', team)} className="w-8 h-8 bg-rose-50 text-rose-400 rounded-lg flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-2xl bg-white/50">
                                <div className="w-14 h-14 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mb-4">
                                    <Layers size={28} />
                                </div>
                                <h5 className="text-[12px] font-black text-slate-900 tracking-tight">No Subordinate Units Detected</h5>
                                <p className="text-[10px] text-slate-400 font-medium mt-1.5 max-w-[240px] text-center italic">Initialize a squad to begin hierarchical delegation.</p>
                                <button 
                                    onClick={() => onAddSquad(dept.id.toString())}
                                    className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                >
                                    + Initialize First Squad
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentCard;
