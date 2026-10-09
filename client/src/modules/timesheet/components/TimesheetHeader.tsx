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
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      {/* Page Title & Context */}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
          activeTab === 'approvals' 
            ? 'bg-purple-600 shadow-purple-600/25 text-white' 
            : 'bg-indigo-600 shadow-indigo-600/25 text-white'
        }`}>
          {activeTab === 'approvals' ? (
            <ShieldCheck size={24} strokeWidth={2.2} />
          ) : (
            <Clock size={22} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-[20px] font-black text-slate-900 tracking-tight">
              {activeTab === 'approvals' ? 'Timesheet Approvals' : 'Timesheets'}
            </h2>
            {activeTab === 'my' && sheet && <StatusBadge s={sheet.status} />}
            {activeTab === 'approvals' && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                pendingCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {pendingCount > 0 ? `${pendingCount} In Queue` : 'Queue Cleared'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
            {activeTab === 'approvals'
              ? 'Supervisory unit desk • Review and authorize team submissions'
              : 'Track and submit your weekly project hours'}
          </p>
        </div>
      </div>

      {/* Week Navigator (Focused primarily for Weekly view) */}
      <div className="flex items-center gap-3 flex-wrap">
        <button 
          onClick={() => setWeekStart(currentWeekMonday)} 
          className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-xs flex items-center gap-2 ${
            isCurrentWeek 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar size={14} />
          This Week
        </button>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
          <button 
            onClick={() => { 
              const d = parseLocalDate(weekStart); 
              d.setDate(d.getDate() - 7); 
              setWeekStart(toLocalDateStr(d)); 
            }} 
            title="Previous Week"
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all"
          >
            <ChevronLeft size={16}/>
          </button>
          
          <div className="px-3.5 flex items-center gap-2">
            <CalendarDays size={14} className="text-indigo-600" />
            <span className="text-[11px] font-black text-slate-700 tracking-tight whitespace-nowrap uppercase">
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
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-all"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};
