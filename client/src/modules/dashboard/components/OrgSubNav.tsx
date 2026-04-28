import React from 'react';
import {
    Activity, Megaphone, FileCheck, GitBranch, Network, Building2,
    Cake, UserPlus, CalendarDays
} from 'lucide-react';

export type OrgSection =
    | 'overview' | 'announcements' | 'policies' | 'employee-tree'
    | 'dept-tree' | 'dept-directory' | 'birthdays' | 'new-hires' | 'calendar';

const SECTIONS: { key: OrgSection; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'overview',        label: 'Overview',         icon: Activity,     color: '#6366f1' },
    { key: 'announcements',   label: 'Announcements',    icon: Megaphone,    color: '#8b5cf6' },
    { key: 'policies',        label: 'Policies',         icon: FileCheck,    color: '#0ea5e9' },
    { key: 'employee-tree',   label: 'Employee Tree',    icon: GitBranch,    color: '#10b981' },
    { key: 'dept-tree',       label: 'Department Tree',  icon: Network,      color: '#f59e0b' },
    { key: 'dept-directory',  label: 'Dept Directory',   icon: Building2,    color: '#ec4899' },
    { key: 'birthdays',       label: 'Birthday Folks',   icon: Cake,         color: '#f97316' },
    { key: 'new-hires',       label: 'New Hires',        icon: UserPlus,     color: '#14b8a6' },
    { key: 'calendar',        label: 'Calendar',         icon: CalendarDays, color: '#ef4444' },
];

interface OrgSubNavProps {
    active: OrgSection;
    onChange: (s: OrgSection) => void;
}

const OrgSubNav: React.FC<OrgSubNavProps> = ({ active, onChange }) => (
    <div className="flex-1 flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1">
        {SECTIONS.map(s => {
            const isActive = active === s.key;
            return (
                <button
                    key={s.key}
                    onClick={() => onChange(s.key)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0
                        ${isActive
                            ? 'text-white shadow-lg scale-[1.02]'
                            : 'text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-700'}`}
                    style={isActive ? {
                        background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                        boxShadow: `0 4px 14px ${s.color}30`,
                    } : undefined}
                >
                    <s.icon size={13} />
                    {s.label}
                    {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80"/>
                    )}
                </button>
            );
        })}
    </div>
);

export { OrgSubNav, SECTIONS };
