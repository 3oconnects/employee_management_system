import React from 'react';
import { 
  Clock, TrendingUp, Target, BarChart2, CheckCircle2, 
  Users, ShieldCheck 
} from 'lucide-react';
import { TabKey, Timesheet, EXPECTED_HRS } from '../types';

interface TimesheetKPIsProps {
  activeTab: TabKey;
  isManager: boolean;
  loggedHours: number;
  progressPct: number;
  sheet: Timesheet | null;
  pendingCount: number;
  totalPendingHours: number;
}

export const TimesheetKPIs: React.FC<TimesheetKPIsProps> = ({
  activeTab,
  isManager,
  loggedHours,
  progressPct,
  sheet,
  pendingCount,
  totalPendingHours
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {activeTab === 'approvals' && isManager ? (
        <>
          {/* Approvals Card 1: Pending Authorizations */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-amber-200 p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Users size={18} strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                pendingCount > 0 
                  ? 'text-amber-800 bg-amber-50 border-amber-200' 
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}>
                {pendingCount > 0 ? `${pendingCount} Action Req` : 'All Clear'}
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-black text-slate-900 tracking-tight leading-none">
                  {pendingCount}
                </span>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Submissions
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Pending Authorizations
              </p>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Direct Reports</span>
              <span className="font-semibold text-slate-600">{pendingCount} in Queue</span>
            </div>
          </div>

          {/* Approvals Card 2: Total Hours Awaiting Verification */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Clock size={18} strokeWidth={2.5}/>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Unit Hours
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-black text-indigo-600 tracking-tight leading-none">
                  {totalPendingHours.toFixed(1)}
                </span>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  hrs total
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Awaiting Verification
              </p>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Avg per Sheet</span>
              <span className="font-semibold text-slate-600">
                {pendingCount > 0 ? (totalPendingHours / pendingCount).toFixed(1) : '0.0'} hrs
              </span>
            </div>
          </div>

          {/* Approvals Card 3: Queue Health */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <CheckCircle2 size={18} strokeWidth={2.5}/>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                SLA Health
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[28px] font-black text-emerald-600 tracking-tight leading-none">
                  {pendingCount === 0 ? '100%' : 'Active'}
                </span>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  turnaround
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Queue Health
              </p>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Resolution SLA</span>
              <span className="font-semibold text-emerald-600">{pendingCount === 0 ? 'Zero Backlog' : 'Under Review'}</span>
            </div>
          </div>

          {/* Approvals Card 4: Governance Role */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-purple-200 p-4.5 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <ShieldCheck size={18} strokeWidth={2.5}/>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Authorized
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[22px] font-black text-slate-900 tracking-tight leading-none">
                  Unit Approver
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Supervisor Authority
              </p>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Sign-off Scope</span>
              <span className="font-semibold text-purple-600">Unit Telemetry</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Personal Card 1: Logged Hours */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Clock size={16} strokeWidth={2.5}/>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                {progressPct >= 100 ? 'Quota Met' : `${(EXPECTED_HRS - loggedHours).toFixed(1)}h left`}
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-black text-indigo-600 tracking-tight leading-none">
                  {loggedHours.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  / {EXPECTED_HRS}.0 hrs
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                Logged Hours
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50">
              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                <span>Weekly Progress</span>
                <span className="font-mono text-slate-600 font-bold">{progressPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct >= 100 ? 'bg-emerald-500' : progressPct > 60 ? 'bg-indigo-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Personal Card 2: Weekly Pace */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <TrendingUp size={16} strokeWidth={2.5}/>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Pace
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  {(loggedHours / 5).toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  h / day
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                Daily Average
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Standard Baseline</span>
              <span className="font-semibold text-slate-600">8.0 hrs</span>
            </div>
          </div>

          {/* Personal Card 3: Target Quota */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-amber-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <Target size={16} strokeWidth={2.5}/>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                Contractual
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  {EXPECTED_HRS}.0
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  hrs / wk
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                Target Quota
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Delta Balance</span>
              <span className={`font-semibold ${
                loggedHours >= EXPECTED_HRS ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {loggedHours >= EXPECTED_HRS ? `+${(loggedHours - EXPECTED_HRS).toFixed(1)}h` : `-${(EXPECTED_HRS - loggedHours).toFixed(1)}h`}
              </span>
            </div>
          </div>

          {/* Personal Card 4: Workflow Status */}
          <div className="bg-white rounded-2xl border border-slate-100 hover:border-purple-200 p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
                <BarChart2 size={16} strokeWidth={2.5}/>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                sheet?.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : sheet?.status === 'submitted'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                {sheet?.status || 'Draft'}
              </span>
            </div>
            <div className="my-1">
              <div className="flex items-baseline gap-1">
                <span className="text-[24px] font-black text-slate-900 tracking-tight leading-none capitalize">
                  {sheet?.status || 'Draft'}
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                Workflow Status
              </p>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Payroll Ready</span>
              <span className="font-semibold text-slate-600">
                {sheet?.status === 'approved' ? 'Yes' : 'Pending'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
