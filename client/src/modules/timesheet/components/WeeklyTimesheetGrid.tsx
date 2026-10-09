import React from 'react';
import { 
  FolderGit2, Sparkles, Zap, Loader2, Save, Send, 
  CheckCircle2, Clock, XCircle, Trash2, Plus, Target, ShieldCheck 
} from 'lucide-react';
import { DAYS, DAY_LABELS, EntryRow, Timesheet } from '../types';
import { StatusBadge } from './TimesheetHeader';
import { fmtDayHeaderDate } from '../utils';

interface WeeklyTimesheetGridProps {
  sheet: Timesheet | null;
  rows: EntryRow[];
  isLocked: boolean;
  saving: boolean;
  autoFilling: boolean;
  loggedHours: number;
  progressPct: number;
  dayTotals: number[];
  dates: string[];
  today: string;
  feedback: { type: 'ok' | 'err'; msg: string } | null;
  setFeedback: (f: { type: 'ok' | 'err'; msg: string } | null) => void;
  fillStandardPreset: () => void;
  autoFill: () => void;
  save: (submitAfter: boolean) => void;
  updateRow: (idx: number, field: string, val: string) => void;
  addRow: () => void;
  removeRow: (idx: number) => void;
}

export const WeeklyTimesheetGrid: React.FC<WeeklyTimesheetGridProps> = ({
  sheet,
  rows,
  isLocked,
  saving,
  autoFilling,
  loggedHours,
  progressPct,
  dayTotals,
  dates,
  today,
  feedback,
  setFeedback,
  fillStandardPreset,
  autoFill,
  save,
  updateRow,
  addRow,
  removeRow
}) => {
  return (
    <div className="space-y-6">
      {/* The Unified Timesheet Matrix Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Card Header & Action Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-2xs">
              <FolderGit2 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-[13px] font-black text-slate-800 tracking-tight">
                  Weekly Time Allocation
                </h3>
                {sheet && <StatusBadge s={sheet.status} />}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Log daily project hours, task descriptions & attendance telemetry
              </p>
            </div>
          </div>

          {/* Integrated Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isLocked && (
              <button 
                onClick={fillStandardPreset} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
                title="Quick fill 8h/day Mon–Fri"
              >
                <Sparkles size={13} className="text-indigo-600" />
                40h Preset
              </button>
            )}

            {!isLocked && (
              <button 
                onClick={autoFill} 
                disabled={autoFilling} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
                title="Sync hours from biometric check-ins"
              >
                {autoFilling ? <Loader2 size={13} className="animate-spin text-indigo-600" /> : <Zap size={13} className="text-amber-500" />}
                {autoFilling ? 'Syncing...' : 'Auto-Fill Telemetry'}
              </button>
            )}

            {!isLocked && (
              <button 
                onClick={() => save(false)} 
                disabled={saving} 
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
            )}

            {!isLocked && (
              <button 
                onClick={() => save(true)} 
                disabled={saving || loggedHours === 0} 
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-tight transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send size={12} />
                Submit Timesheet
              </button>
            )}
          </div>
        </div>

        {/* Status Locked Notification Banner */}
        {isLocked && (
          <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-medium ${
            sheet?.status === 'approved' 
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-800' 
              : 'bg-amber-50/80 border-amber-100 text-amber-800'
          }`}>
            <div className="flex items-center gap-2.5">
              {sheet?.status === 'approved' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Clock size={16} className="text-amber-600" />}
              <span>
                {sheet?.status === 'approved' 
                  ? 'Timesheet officially approved by supervisor. Allocation is locked.' 
                  : 'Timesheet submitted and currently locked awaiting executive approval.'}
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current">
              Locked
            </span>
          </div>
        )}

        {/* Feedback toast */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'ok' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'ok' ? <CheckCircle2 size={15} className="text-emerald-600"/> : <XCircle size={15} className="text-rose-600"/>}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">×</button>
          </div>
        )}

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1050px] border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-xs font-bold text-slate-500">
                <th className="px-6 py-3 w-80 uppercase tracking-wider text-[11px] text-slate-400">
                  Project / Activity
                </th>
                {DAYS.map((d, i) => {
                  const dayDate = dates[i];
                  const isDayToday = dayDate === today;
                  const isWeekend = d === 'sat' || d === 'sun';
                  return (
                    <th 
                      key={d} 
                      className={`px-2 py-2.5 text-center w-20 transition-colors ${
                        isDayToday 
                          ? 'bg-indigo-50/60 text-indigo-700 border-x border-indigo-100/60' 
                          : isWeekend 
                          ? 'bg-slate-100/30 text-slate-400' 
                          : ''
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${
                          isDayToday ? 'text-indigo-700' : isWeekend ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                          {DAY_LABELS[i]}
                        </span>
                        <span className={`text-[10px] font-semibold mt-0.5 ${
                          isDayToday ? 'text-indigo-600 font-bold' : 'text-slate-400'
                        }`}>
                          {fmtDayHeaderDate(dayDate)}
                        </span>
                        {isDayToday && (
                          <span className="mt-0.5 px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-black tracking-widest uppercase">
                            Today
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                <th className="px-4 py-3 text-center w-24 uppercase tracking-wider text-[11px] text-slate-400">
                  Total
                </th>
                {!isLocked && (
                  <th className="px-3 py-3 w-14 text-center uppercase tracking-wider text-[11px] text-slate-400">
                    Action
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const rowTotal = DAYS.reduce((s, d) => s + (parseFloat(row[`${d}_hours`]) || 0), 0);
                const isTelemetryRow = row.project_name.includes('Protocol Verification') || row.project_name.includes('Attendance');

                return (
                  <tr key={idx} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-3">
                      <div className="space-y-1">
                        <input 
                          type="text" 
                          value={row.project_name} 
                          onChange={e => updateRow(idx, 'project_name', e.target.value)} 
                          disabled={isLocked || isTelemetryRow} 
                          placeholder="Project or Client Name..." 
                          className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-600" 
                        />
                        <input 
                          type="text" 
                          value={row.task_desc} 
                          onChange={e => updateRow(idx, 'task_desc', e.target.value)} 
                          disabled={isLocked || isTelemetryRow} 
                          placeholder="Task description / ticket reference..." 
                          className="w-full bg-transparent border-none text-[11px] font-medium text-slate-500 placeholder:text-slate-300 outline-none px-1" 
                        />
                      </div>
                    </td>

                    {DAYS.map((d, dIdx) => {
                      const val = row[`${d}_hours`];
                      const num = parseFloat(val) || 0;
                      const isDayToday = dates[dIdx] === today;
                      const isWeekend = d === 'sat' || d === 'sun';

                      return (
                        <td 
                          key={d} 
                          className={`px-2 py-3 text-center ${
                            isDayToday ? 'bg-indigo-50/20 border-x border-indigo-100/30' : isWeekend ? 'bg-slate-50/20' : ''
                          }`}
                        >
                          <input 
                            type="number" 
                            step="0.5" 
                            min="0" 
                            max="24" 
                            value={val} 
                            onFocus={e => e.target.select()}
                            onChange={e => updateRow(idx, `${d}_hours`, e.target.value)} 
                            disabled={isLocked} 
                            className={`w-14 mx-auto text-center py-1.5 rounded-lg text-xs font-bold outline-none border transition-all ${
                              num > 8 
                                ? 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold shadow-2xs' 
                                : num > 0 
                                ? 'bg-indigo-50/80 text-indigo-700 border-indigo-200 font-extrabold shadow-2xs' 
                                : 'bg-slate-50/70 text-slate-400 border-slate-200/80 hover:border-slate-300 focus:bg-white focus:text-slate-800'
                            }`} 
                          />
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${
                        rowTotal > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-400'
                      }`}>
                        {rowTotal.toFixed(1)}h
                      </span>
                    </td>

                    {!isLocked && (
                      <td className="px-3 py-3 text-center">
                        <button 
                          onClick={() => removeRow(idx)} 
                          title="Remove Line"
                          className="w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* Summary & Totals Footer */}
            <tfoot className="bg-slate-50/80 border-t border-slate-200/80">
              <tr className="text-xs font-bold text-slate-600">
                <td className="px-6 py-3">
                  {!isLocked && (
                    <button 
                      onClick={addRow} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-bold shadow-2xs transition-all"
                    >
                      <Plus size={13} className="text-indigo-600" /> Add Project Line
                    </button>
                  )}
                </td>

                {dayTotals.map((t, i) => (
                  <td key={i} className="px-2 py-3 text-center">
                    <span className={`text-xs font-black ${
                      t > 8 ? 'text-amber-600' : t > 0 ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                      {t > 0 ? `${t.toFixed(1)}h` : '0.0h'}
                    </span>
                  </td>
                ))}

                <td className="px-4 py-3 text-center">
                  <span className="inline-flex px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-xs">
                    {loggedHours.toFixed(1)} hrs
                  </span>
                </td>

                {!isLocked && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Integrated Weekly Progress Track */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Target size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Weekly Quota Progress
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {loggedHours.toFixed(1)} of 40.0 hours logged ({progressPct.toFixed(0)}%)
              </p>
            </div>
          </div>

          <div className="flex-1 max-w-md w-full flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
            <span className="font-mono text-xs font-black text-slate-700 w-10 text-right">
              {progressPct.toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              loggedHours >= 40 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {loggedHours >= 40 ? '✓ Quota Reached' : `${(40 - loggedHours).toFixed(1)}h Remaining`}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Daily Distribution & Guidelines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Allocation Bar Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[13px] font-black text-slate-800 tracking-tight">
                Daily Work Allocation
              </h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Standard: 8.0h / day
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mb-4">
              Visual breakdown of logged hours against daily quotas
            </p>

            {/* Chart area with 8h dashed line */}
            <div className="relative pt-6 pb-2">
              <div className="absolute left-0 right-0 top-10 border-b border-dashed border-slate-200 flex justify-end">
                <span className="text-[9px] font-bold text-slate-400 pr-1 -mt-3.5 bg-white">8h Quota</span>
              </div>

              <div className="flex items-end justify-between gap-3 h-28 px-2 relative z-10">
                {DAYS.map((d, i) => {
                  const total = dayTotals[i];
                  const pct = Math.min(100, (total / 10) * 100);
                  const isTodayCol = dates[i] === today;
                  const isWeekend = d === 'sat' || d === 'sun';

                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                      <span className={`text-[10px] font-bold transition-all ${
                        total > 0 ? (total >= 8 ? 'text-indigo-600 font-black' : 'text-slate-700') : 'opacity-0 group-hover:opacity-100 text-slate-300'
                      }`}>
                        {total > 0 ? `${total.toFixed(1)}h` : '0h'}
                      </span>
                      
                      <div className="w-8 h-20 flex items-end justify-center">
                        {total > 0 ? (
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-500 shadow-2xs ${
                              isTodayCol ? 'bg-indigo-600' : total >= 8 ? 'bg-indigo-500' : 'bg-indigo-300'
                            }`} 
                            style={{ height: `${pct}%`, minHeight: '6px' }}
                          />
                        ) : (
                          <div className="w-full h-1 bg-slate-200/80 rounded-full" />
                        )}
                      </div>
                      
                      <div className="text-center mt-1">
                        <span className={`text-[11px] font-black uppercase tracking-wider block ${
                          isTodayCol ? 'text-indigo-600' : isWeekend ? 'text-slate-400' : 'text-slate-700'
                        }`}>
                          {DAY_LABELS[i]}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {dates[i].slice(8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Submission Protocol & Checklist */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <div>
                <h4 className="text-[13px] font-black text-slate-800 tracking-tight">
                  Timesheet Protocol & Checklist
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">Weekly compliance status</p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    loggedHours >= 40 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {loggedHours >= 40 ? '✓' : '•'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">40.0h Weekly Target</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {loggedHours >= 40 ? 'Standard quota achieved' : `${(40 - loggedHours).toFixed(1)}h remaining to reach quota`}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  loggedHours >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {loggedHours >= 40 ? 'Achieved' : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Biometric Attendance Sync</p>
                    <p className="text-[10px] text-slate-400 font-medium">Telemetry sync available via Auto-Fill</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                  Ready
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                    ℹ
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Friday 6:00 PM Deadline</p>
                    <p className="text-[10px] text-slate-400 font-medium">Weekly sheets route for supervisor approval</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  Protocol
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
