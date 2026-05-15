import React from 'react';
import { Inbox, Shield, Calendar, Users, Briefcase, ChevronLeft, ChevronRight, Clock, Building2, Layers } from 'lucide-react';
import { ApprovalType } from '../types';

interface ApprovalSidebarProps {
    filterType: ApprovalType | 'all';
    setFilterType: (type: any) => void;
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
}

const ApprovalSidebar: React.FC<ApprovalSidebarProps> = ({ 
    filterType, 
    setFilterType, 
    isCollapsed, 
    setIsCollapsed 
}) => {
    return (
        <div className={`transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-64'} flex-shrink-0`}>
            <div className="sticky top-8 space-y-4">
                <div className="flex items-center justify-between px-2 mb-2">
                    {!isCollapsed && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categories</p>}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-400 hover:text-indigo-600"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>
                
                <div className="bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm space-y-1">
                    {[
                        { id: 'all', label: 'All Requests', icon: Inbox, color: 'text-slate-400' },
                        { id: 'department_creation', label: 'Department Requests', icon: Building2, color: 'text-indigo-600' },
                        { id: 'team_creation', label: 'Team Requests', icon: Layers, color: 'text-indigo-400' },
                        { id: 'role_change', label: 'Role Request', icon: Shield, color: 'text-indigo-500' },
                        { id: 'leave', label: 'Leave Request', icon: Calendar, color: 'text-amber-500' },
                        { id: 'team_change', label: 'Team Request', icon: Users, color: 'text-sky-500' },
                        { id: 'promotion', label: 'Promotion Request', icon: Briefcase, color: 'text-emerald-500' },
                        { id: 'attendance', label: 'Attendance Request', icon: Clock, color: 'text-violet-500' },
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setFilterType(t.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold transition-all relative group
                                ${filterType === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <t.icon size={16} className={`${t.color} flex-shrink-0`} />
                            {!isCollapsed && <span className="truncate">{t.label}</span>}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50">
                                    {t.label}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ApprovalSidebar;
