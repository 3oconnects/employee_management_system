import React from 'react';
import { Layers, Users, MoreHorizontal, Edit2, Trash2, Eye } from 'lucide-react';

interface DepartmentGridCardProps {
    dept: any;
    teams: any[];
    onView: (type: 'dept' | 'team', item: any) => void;
    onEdit: (type: 'dept' | 'team', item: any) => void;
    onDelete: (type: 'dept' | 'team', item: any) => void;
}

const DepartmentGridCard: React.FC<DepartmentGridCardProps> = ({
    dept,
    teams,
    onView,
    onEdit,
    onDelete
}) => {
    return (
        <div className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden">
            
            {/* Background Decoration */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors duration-500" />
            
            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10 group-hover:scale-110 transition-transform duration-500">
                    <Layers size={22} />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onEdit('dept', dept)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDelete('dept', dept)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shadow-sm">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <h3 className="text-[18px] font-black text-slate-900 tracking-tight leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                    {dept.name}
                </h3>
                <p className="text-[12px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                    {dept.description || 'Primary organizational division managing core enterprise workflows and strategic initiatives.'}
                </p>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resources</span>
                    <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1.5" title="Subordinate Squads">
                            <Layers size={12} className="text-indigo-500" />
                            <span className="text-[12px] font-bold text-slate-700">{teams.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Assigned Agents">
                            <Users size={12} className="text-emerald-500" />
                            <span className="text-[12px] font-bold text-slate-700">{dept.employee_count}</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => onView('dept', dept)}
                    className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                >
                    <Eye size={16} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
};

export default DepartmentGridCard;
