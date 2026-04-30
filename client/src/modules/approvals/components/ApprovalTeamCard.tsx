import React from 'react';
import { Users, Code, Briefcase, UserCircle, Settings } from 'lucide-react';

interface ApprovalTeamCardProps {
    dept: string;
    requestCount: number;
    viewMode: 'list' | 'grid' | 'teams';
    children: React.ReactNode;
    avatars: string[];
}

const ApprovalTeamCard: React.FC<ApprovalTeamCardProps> = ({ 
    dept, 
    requestCount, 
    viewMode, 
    children,
    avatars 
}) => {
    const getDeptIcon = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('engineering') || n.includes('tech')) return <Code size={20} />;
        if (n.includes('manage')) return <Briefcase size={20} />;
        if (n.includes('hr') || n.includes('people')) return <UserCircle size={20} />;
        return <Settings size={20} />;
    };

    if (viewMode !== 'teams') {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-1 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{dept}</h3>
                    <div className="h-px bg-slate-100 flex-1" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{requestCount} Items</span>
                </div>
                {children}
            </div>
        );
    }

    return (
        <div className="group bg-white border border-slate-100 rounded-[28px] p-5 shadow-2xl shadow-slate-200/40 hover:shadow-indigo-500/10 transition-all duration-500 border-b-4 border-b-slate-50 hover:border-b-indigo-500 flex flex-col h-full">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                        {getDeptIcon(dept)}
                    </div>
                    <div>
                        <h3 className="text-[18px] font-black text-slate-800 tracking-tight leading-none">{dept}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5 flex items-center gap-2">
                            <Users size={10} className="text-indigo-400" />
                            {requestCount} Workflows
                        </p>
                    </div>
                </div>
                
                <div className="flex -space-x-2.5 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                    {avatars.slice(0, 3).map((name, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-[3px] border-white bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm transition-transform hover:-translate-y-1">
                            {name.charAt(0)}
                        </div>
                    ))}
                    {avatars.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-[3px] border-white bg-indigo-50 flex items-center justify-center text-[9px] font-black text-indigo-600 shadow-sm">
                            +{avatars.length - 3}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar space-y-1.5">
                {children}
            </div>
        </div>
    );
};

export default ApprovalTeamCard;
