import React from 'react';
import { User, Briefcase, CreditCard, GraduationCap, BookOpen, Clock, Calendar, Award, FileText } from 'lucide-react';

export const TABS = [
    { key: 'overview',     label: 'Overview',      icon: User },
    { key: 'education',    label: 'Education',     icon: GraduationCap },
    { key: 'experience',   label: 'Experience',    icon: BookOpen },
    { key: 'job',          label: 'Job Details',   icon: Briefcase },
    { key: 'compensation', label: 'Compensation',  icon: CreditCard },
    { key: 'attendance',   label: 'Attendance',    icon: Clock },
    { key: 'leave',        label: 'Leave',         icon: Calendar },
    { key: 'documents',    label: 'Documents',     icon: FileText },
] as const;

export type TabKey = typeof TABS[number]['key'];

interface Props {
    active: TabKey;
    onChange: (key: TabKey) => void;
}

const ProfileTabs: React.FC<Props> = ({ active, onChange }) => (
    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar">
        {TABS.map(t => {
            const isActive = active === t.key;
            return (
                <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                        isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                >
                    <t.icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                    {t.label}
                </button>
            );
        })}
    </div>
);

export default ProfileTabs;
