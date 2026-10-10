import React from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, CalendarDays, ShieldCheck } from 'lucide-react';
import { TabKey, Timesheet } from '../types';
import { parseLocalDate, toLocalDateStr, fmtWeekRange } from '../utils';

interface TimesheetHeaderProps {
  activeTab: TabKey;
  sheet: Timesheet | null;
  weekStart: string;
  setWeekStart: (ws: string) => void;
  dates: string[];
  currentWeekMonday: string;
  isCurrentWeek: boolean;
  isManager: boolean;
  pendingCount: number;
}

export const StatusBadge: React.FC<{ s: string }> = ({ s }) => {
  const configs: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    draft:     { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
    submitted: { label: 'Pending Approval', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500 animate-pulse' },
    approved:  { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    rejected:  { label: 'Revision Needed', bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' }
  };
  const c = configs[s] || configs.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

export const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  activeTab,
  sheet,
  weekStart,
  setWeekStart,
  dates,
  currentWeekMonday,
  isCurrentWeek,
  isManager,
  pendingCount
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Page Title & Subtitle — Matching Onboarding & Approvals standard */}
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {activeTab === 'approvals' ? 'Timesheet Authorizations' : 'Weekly Timesheets'}
          </h1>
          {activeTab === 'my' && sheet && <StatusBadge s={sheet.status} />}
          {activeTab === 'approvals' && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              pendingCount > 0
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {pendingCount > 0 ? `${pendingCount} In Queue` : 'Queue Cleared'}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {activeTab === 'approvals'
            ? 'Review and authorize team timesheet submissions with biometric telemetry'
            : 'Record project task hours, reconcile with attendance records, and submit for supervisor approval'}
        </p>
      </div>

      {/* Week Navigator Controls with reduced rounded-lg corners */}
      <div className="flex items-center gap-2 flex-wrap">
        <button 
          onClick={() => setWeekStart(currentWeekMonday)} 
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border shadow-xs flex items-center gap-2 ${
            isCurrentWeek 
              ? 'bg-[#EEF4FE] border-[#D0E1FD] text-[#1064EA]' 
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calendar size={14} />
          This Week
        </button>

        <div className="flex items-center bg-white border border-slate-200/90 rounded-lg p-0.5 shadow-xs">
          <button 
            onClick={() => { 
              const d = parseLocalDate(weekStart); 
              d.setDate(d.getDate() - 7); 
              setWeekStart(toLocalDateStr(d)); 
            }} 
            title="Previous Week"
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={15}/>
          </button>
          
          <div className="px-3 flex items-center gap-2">
            <CalendarDays size={14} className="text-[#1064EA]" />
            <span className="text-xs font-semibold text-slate-700 tracking-tight whitespace-nowrap">
              {fmtWeekRange(weekStart, dates[6])}
            </span>
          </div>

          <button 
            onClick={() => { 
              const d = parseLocalDate(weekStart); 
              d.setDate(d.getDate() + 7); 
              setWeekStart(toLocalDateStr(d)); 
            }} 
            title="Next Week"
            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500 hover:text-slate-900 transition-all"
          >
            <ChevronRight size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
};
