import React from 'react';
import { Calendar, History, ShieldCheck } from 'lucide-react';
import { TabKey } from '../types';

interface TimesheetTabsProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isManager: boolean;
  historyCount: number;
  pendingCount: number;
}

export const TimesheetTabs: React.FC<TimesheetTabsProps> = ({
  activeTab,
  setActiveTab,
  isManager,
  historyCount,
  pendingCount
}) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-lg w-fit border border-slate-200/80 shadow-xs">
      {/* Tab 1: Weekly Timesheet */}
      <button
        onClick={() => setActiveTab('my')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
          activeTab === 'my'
            ? 'bg-white text-[#1064EA] shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <Calendar size={13} />
        Weekly Timesheet
      </button>

      {/* Tab 2: History */}
      <button
        onClick={() => setActiveTab('history')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
          activeTab === 'history'
            ? 'bg-white text-[#1064EA] shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <History size={13} />
        History
        {historyCount > 0 && (
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
            activeTab === 'history'
              ? 'bg-[#EEF4FE] text-[#1064EA]'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {historyCount}
          </span>
        )}
      </button>

      {/* Tab 3: Approvals (Manager only) */}
      {isManager && (
        <button
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'approvals'
              ? 'bg-white text-[#1064EA] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={13} />
          Approvals
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
            pendingCount > 0
              ? 'bg-[#FEF7EC] text-[#D97706] border border-[#FDE68A] animate-pulse'
              : activeTab === 'approvals'
              ? 'bg-[#E6F6EE] text-[#00A859] border border-[#B7E8CE]'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {pendingCount}
          </span>
        </button>
      )}
    </div>
  );
};
