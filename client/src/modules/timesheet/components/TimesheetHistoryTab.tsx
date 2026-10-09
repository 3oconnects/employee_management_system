import React from 'react';
import { Database, Loader2, CalendarDays, ArrowRight } from 'lucide-react';
import { HistoryItem } from '../types';
import { StatusBadge } from './TimesheetHeader';
import { fmtWeekRange } from '../utils';

interface TimesheetHistoryTabProps {
  history: HistoryItem[];
  histLoading: boolean;
  histFilter: string;
  setHistFilter: (f: string) => void;
  onSelectWeek: (weekStart: string) => void;
}

export const TimesheetHistoryTab: React.FC<TimesheetHistoryTabProps> = ({
  history,
  histLoading,
  histFilter,
  setHistFilter,
  onSelectWeek
}) => {
  const filtered = history.filter(h => histFilter === 'all' || h.status === histFilter);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Submission History</h3>
          <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">
            {history.length} records
          </span>
        </div>

        {/* Status Filter Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
          {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
            <button 
              key={f} 
              onClick={() => setHistFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                histFilter === f 
                  ? 'bg-indigo-600 text-white shadow-2xs' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {histLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="text-indigo-600 animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading history records...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Database size={36} className="text-slate-300" />
          <div className="text-center">
            <p className="text-xs font-black text-slate-800 uppercase tracking-wider">No timesheet records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Your submitted timesheets will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4">Total Hours</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Remarks</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-800">{fmtWeekRange(h.week_start, h.week_end)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs">
                      {parseFloat(h.total_hours || '0').toFixed(1)} hrs
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge s={h.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {h.remarks || 'No notes attached.'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onSelectWeek(h.week_start.slice(0, 10))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-bold transition-all"
                    >
                      Open Week <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
