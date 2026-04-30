import React from 'react';
import { Inbox, Activity, Users, Shield, LucideIcon } from 'lucide-react';

interface StatProps {
    label: string;
    val: string | number;
    icon: LucideIcon;
    color: string;
    bg: string;
}

const StatCard: React.FC<StatProps> = ({ label, val, icon: Icon, color, bg }) => (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon size={14} className={color} />
            </div>
            <div>
                <p className="text-[18px] font-black text-slate-800 leading-none">{val}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">{label}</p>
            </div>
        </div>
    </div>
);

interface ApprovalStatsProps {
    pendingCount: number;
    historyCount: number;
    teamCount: number;
    activeTab: string;
}

const ApprovalStats: React.FC<ApprovalStatsProps> = ({ pendingCount, historyCount, teamCount, activeTab }) => {
    const stats = [
        { label: 'Total Pending', val: pendingCount, icon: Inbox, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total History', val: activeTab === 'history' ? historyCount : '...', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Current Team', val: teamCount, icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Response Rate', val: '98%', icon: Shield, color: 'text-sky-600', bg: 'bg-sky-50' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <StatCard key={i} {...stat} />
            ))}
        </div>
    );
};

export default ApprovalStats;
