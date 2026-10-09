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
    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
      {/* Tab 1: Weekly Timesheet */}
      <button
        onClick={() => setActiveTab('my')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
          activeTab === 'my'
            ? 'bg-white text-indigo-600 shadow-xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <Calendar size={14} />
        Weekly Timesheet
      </button>

      {/* Tab 2: History */}
      <button
        onClick={() => setActiveTab('history')}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
          activeTab === 'history'
            ? 'bg-white text-indigo-600 shadow-xs'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <History size={14} />
        History
        {historyCount > 0 && (
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
            activeTab === 'history'
              ? 'bg-indigo-50 text-indigo-700'
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
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === 'approvals'
              ? 'bg-white text-purple-700 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={14} />
          Approvals
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
            pendingCount > 0
              ? 'bg-amber-100 text-amber-800 animate-pulse'
              : activeTab === 'approvals'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {pendingCount}
          </span>
        </button>
      )}
    </div>
  );
};
