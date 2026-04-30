import React from 'react';
import { User, Briefcase, CreditCard, GraduationCap, BookOpen, Clock, Calendar, Award, FileText, Settings } from 'lucide-react';

export const TABS = [
    { key: 'overview',     label: 'Overview',    icon: User },
    { key: 'job',          label: 'Job Details',  icon: Briefcase },
    { key: 'compensation', label: 'Compensation', icon: CreditCard },
    { key: 'education',    label: 'Education',    icon: GraduationCap },
    { key: 'experience',   label: 'Experience',   icon: BookOpen },
    { key: 'attendance',   label: 'Attendance',   icon: Clock },
    { key: 'leave',        label: 'Leave',        icon: Calendar },
    { key: 'performance',  label: 'Reviews',      icon: Award },
    { key: 'documents',    label: 'Documents',    icon: FileText },
    { key: 'settings',     label: 'Settings',     icon: Settings },
] as const;

export type TabKey = typeof TABS[number]['key'];

interface Props {
    active: TabKey;
    onChange: (key: TabKey) => void;
}

const ProfileTabs: React.FC<Props> = ({ active, onChange }) => (
    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto">
        {TABS.map(t => (
            <button key={t.key} onClick={() => onChange(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold rounded-lg transition-all
                    ${active === t.key ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
                <t.icon size={13}/> {t.label}
            </button>
        ))}
    </div>
);

export default ProfileTabs;
