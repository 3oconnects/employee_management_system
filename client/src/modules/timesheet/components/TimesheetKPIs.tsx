import React from 'react';
import { 
  Clock, TrendingUp, Target, CheckCircle2, 
  Users, ShieldCheck, AlertCircle 
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
          {/* Approvals Card 1: Pending Submissions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Pending Authorizations</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Users size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{pendingCount}</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {pendingCount > 0 ? `${pendingCount} team sheets require sign-off` : 'Zero backlog • Queue fully cleared'}
            </p>
          </div>

          {/* Approvals Card 2: Total Volume Awaiting */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Logged Volume Awaiting</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600 tracking-tight">{totalPendingHours.toFixed(1)} hrs</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {pendingCount > 0 ? `Avg ${(totalPendingHours / pendingCount).toFixed(1)} hrs per submission` : 'No pending hours in queue'}
            </p>
          </div>

          {/* Approvals Card 3: Queue Health */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Queue Resolution SLA</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {pendingCount === 0 ? '100%' : 'Active'}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {pendingCount === 0 ? 'All submissions processed' : 'Under supervisory review'}
            </p>
          </div>

          {/* Approvals Card 4: Governance Scope */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Sign-off Authority</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">Unit Approver</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Direct reports & biometric telemetry</p>
          </div>
        </>
      ) : (
        <>
          {/* Personal Card 1: Logged Hours */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Total Logged Hours</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {loggedHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ {EXPECTED_HRS}.0 hrs</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {progressPct >= 100 
                ? 'Standard 40.0h quota fulfilled' 
                : `${(EXPECTED_HRS - loggedHours).toFixed(1)}h remaining this period`}
            </p>
          </div>

          {/* Personal Card 2: Weekly Progress */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Weekly Progress</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {progressPct.toFixed(0)}%
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Daily pace: {(loggedHours / 5).toFixed(1)} hrs / day average
            </p>
          </div>

          {/* Personal Card 3: Target Quota */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Target Quota</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Target size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {EXPECTED_HRS}.0 hrs
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Standard weekly contractual baseline
            </p>
          </div>

          {/* Personal Card 4: Workflow Status */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">Timesheet Status</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight capitalize">
              {sheet?.status || 'Draft'}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {sheet?.status === 'approved' 
                ? 'Approved & confirmed for payroll' 
                : sheet?.status === 'submitted'
                ? 'Submitted for manager review'
                : 'Draft • Ready for entry'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

