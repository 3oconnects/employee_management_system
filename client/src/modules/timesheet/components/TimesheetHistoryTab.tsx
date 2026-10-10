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
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-bold text-slate-900">Submission History</h3>
          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200/80 rounded-full text-xs font-semibold text-slate-600">
            {history.length} records
          </span>
        </div>

        {/* Status Filter Toggle */}
        <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200/80 shadow-xs">
          {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
            <button 
              key={f} 
              onClick={() => setHistFilter(f)}
              className={`px-3 py-1 text-xs font-semibold capitalize rounded-md transition-all ${
                histFilter === f 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {histLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={22} className="text-blue-600 animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Loading history records...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Database size={32} className="text-slate-300" />
          <div className="text-center">
            <p className="text-xs font-bold text-slate-700">No timesheet records found</p>
            <p className="text-xs text-slate-400 mt-0.5">Your submitted timesheets will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 text-xs font-semibold text-slate-500 border-b border-slate-200/80">
                <th className="px-5 py-3.5">Period</th>
                <th className="px-5 py-3.5">Total Hours</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Remarks</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map(h => (
                <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-400" />
                      <span className="font-semibold text-slate-800">{fmtWeekRange(h.week_start, h.week_end)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 text-xs">
                      {parseFloat(h.total_hours || '0').toFixed(1)} hrs
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge s={h.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-normal">
                    {h.remarks || 'No notes attached.'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onSelectWeek(h.week_start.slice(0, 10))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 rounded-md text-xs font-semibold transition-all shadow-xs"
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
