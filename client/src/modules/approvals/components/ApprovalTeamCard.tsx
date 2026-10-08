import React from 'react';
import { Users, Code, Briefcase, UserCircle, Settings } from 'lucide-react';

interface ApprovalTeamCardProps {
    dept: string;
    requestCount: number;
    viewMode: 'list' | 'grid' | 'teams';
    children: React.ReactNode;
    avatars: string[];
    /** what the count means for the current tab, e.g. 'pending', 'completed', 'of yours' */
    countLabel?: string;
}

const getDeptIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('engineering') || n.includes('tech')) return <Code size={16} />;
    if (n.includes('manage')) return <Briefcase size={16} />;
    if (n.includes('hr') || n.includes('people')) return <UserCircle size={16} />;
    return <Settings size={16} />;
};

const ApprovalTeamCard: React.FC<ApprovalTeamCardProps> = ({
    dept,
    requestCount,
    viewMode,
    children,
    avatars,
    countLabel = 'pending'
}) => {
    // one bubble per distinct person, not one per request
    const people = Array.from(new Set(avatars.filter(Boolean)));
    const tints = ['from-indigo-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500'];
    // Non-teams view: simple section header
    if (viewMode !== 'teams') {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3 px-1 py-2">
                    <div className="w-1.5 h-4 rounded-full bg-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{dept}</h3>
                    <div className="h-px bg-slate-200/80 flex-1" />
                    <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {requestCount} {requestCount === 1 ? 'item' : 'items'}
                    </span>
                </div>
                <div className="space-y-2.5">
                    {children}
                </div>
            </div>
        );
    }

    // Teams card view
    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl flex flex-col h-full hover:border-slate-300 hover:shadow-md transition-all overflow-hidden shadow-xs">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl flex items-center justify-center shadow-xs">
                        {getDeptIcon(dept)}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 leading-tight">{dept}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Users size={11} />
                            <span>{requestCount} {countLabel} {requestCount === 1 ? 'request' : 'requests'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex -space-x-2 flex-shrink-0">
                    {people.slice(0, 3).map((name, i) => (
                        <div
                            key={name}
                            className={`w-7 h-7 rounded-full border-2 border-white bg-gradient-to-tr ${tints[i % tints.length]} flex items-center justify-center text-[11px] font-bold text-white shadow-xs`}
                            title={name}
                        >
                            {name.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {people.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-xs">
                            +{people.length - 3}
                        </div>
                    )}
                </div>
            </div>

            {/* Card body — scrollable request list */}
            <div className="flex-1 min-w-0 p-3.5 space-y-3 bg-slate-50/40">
                {children}
            </div>
        </div>
    );
};

export default ApprovalTeamCard;
