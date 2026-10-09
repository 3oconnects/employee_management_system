import React, { useState } from 'react';
import { 
  ShieldCheck, Search, X, RefreshCw, Loader2, CheckCircle2, 
  Check, CalendarDays, CheckCheck, ArrowRight, Clock, FileText, 
  ChevronDown, ChevronUp, Calendar 
} from 'lucide-react';
import { PendingItem } from '../types';
import { fmtWeekRange } from '../utils';

interface TimesheetApprovalsTabProps {
  pending: PendingItem[];
  filteredPending: PendingItem[];
  appLoading: boolean;
  appSearch: string;
  setAppSearch: (s: string) => void;
  appFilter: 'all' | 'full' | 'partial';
  setAppFilter: (f: 'all' | 'full' | 'partial') => void;
  totalPendingHours: number;
  onRefresh: () => void;
  onSwitchToMy: () => void;
  onApprove: (id: string) => Promise<void>;
  onOpenReject: (item: PendingItem) => void;
}

export const TimesheetApprovalsTab: React.FC<TimesheetApprovalsTabProps> = ({
  pending,
  filteredPending,
  appLoading,
  appSearch,
  setAppSearch,
  appFilter,
  setAppFilter,
  totalPendingHours,
  onRefresh,
  onSwitchToMy,
  onApprove,
  onOpenReject
}) => {
  return (
    <div className="space-y-5">
      {/* ── Submodule Card Container ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Section 1: Header Banner (Spacious, Never Collapsing) */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-[14px] font-black text-slate-900 tracking-tight uppercase">
                  Unit Timesheet Authorizations
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  pending.length > 0 
                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {pending.length > 0 ? `${pending.length} Action Required` : 'Zero Backlog'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Review and authorize team submissions • Total pending volume:{' '}
                <span className="font-bold text-slate-700">{totalPendingHours.toFixed(1)} hrs</span>
              </p>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onRefresh}
              disabled={appLoading}
              title="Refresh pending submissions"
              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={13} className={appLoading ? 'animate-spin text-purple-600' : ''} />
              <span>{appLoading ? 'Refreshing...' : 'Refresh Queue'}</span>
            </button>
          </div>
        </div>

        {/* Section 2: Dedicated Search & Filter Toolbar (Spacious Layout) */}
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Search Box with proper padding and icon alignment */}
          <div className="relative w-full sm:w-80 md:w-96 flex-shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={appSearch}
              onChange={e => setAppSearch(e.target.value)}
              placeholder="Search by employee name or email..."
              className="w-full bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200/90 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all shadow-2xs"
            />
            {appSearch && (
              <button
                onClick={() => setAppSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 border border-slate-200/70 rounded-xl text-[11px] font-bold self-start sm:self-auto">
            <button
              onClick={() => setAppFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                appFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({pending.length})
            </button>
            <button
              onClick={() => setAppFilter('full')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                appFilter === 'full'
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              40h+ ({pending.filter(p => (parseFloat(p.total_hours) || 0) >= 40).length})
            </button>
            <button
              onClick={() => setAppFilter('partial')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                appFilter === 'partial'
                  ? 'bg-white text-amber-700 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Exceptions ({pending.filter(p => (parseFloat(p.total_hours) || 0) < 40).length})
            </button>
          </div>
        </div>

        {/* Section 3: Content Body */}
        {appLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 animate-pulse">
              <Loader2 size={24} className="animate-spin" />
            </div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Retrieving pending timesheet queue...
            </span>
          </div>
        ) : pending.length === 0 ? (
          /* Executive "All Caught Up / Zero Backlog" Empty State */
          <div className="p-10 md:p-14 flex flex-col items-center text-center">
            {/* Glowing Hero Icon */}
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10">
                <CheckCircle2 size={38} strokeWidth={2.2} />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-2xs">
                <Check size={13} strokeWidth={3} />
              </span>
            </div>

            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              Queue Fully Cleared • Zero Backlog
            </span>

            <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              All Unit Timesheets Approved
            </h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-md mt-1 mb-8 leading-relaxed">
              There are currently no timesheets in the queue awaiting supervisor authorization. All submissions within your purview have been evaluated.
            </p>

            {/* Informative Guidance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full text-left">
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 text-indigo-600 mb-2">
                  <CalendarDays size={16} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Weekly Cycle</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Team submissions close every Friday at 6:00 PM. New weekly batches will automatically populate here.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 text-emerald-600 mb-2">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Telemetry Guard</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Entries are automatically reconciled with biometric check-in/out records prior to landing in your queue.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center gap-2.5 text-purple-600 mb-2">
                  <CheckCheck size={16} />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">Payroll Sync</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Authorized hours are consolidated and released for payroll processing at the start of each work week.
                </p>
              </div>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="mt-8 flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={onRefresh}
                className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
              >
                <RefreshCw size={13} />
                Refresh Queue
              </button>
              <button
                onClick={onSwitchToMy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                Switch to My Timesheet
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ) : filteredPending.length === 0 ? (
          /* Filtered No Matches */
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Search size={22} />
            </div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">No Matching Submissions</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No timesheet submissions matched your search query or filter criteria.
            </p>
            <button
              onClick={() => { setAppSearch(''); setAppFilter('all'); }}
              className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Clear Filter
            </button>
          </div>
        ) : (
          /* Submissions List */
          <div className="divide-y divide-slate-100">
            <div className="px-6 py-3 bg-slate-50/70 hidden md:flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <span className="w-1/3">Employee / Applicant</span>
              <span className="w-1/4">Period Range</span>
              <span className="w-1/6 text-center">Logged Hours</span>
              <span className="w-1/4 text-right">Verification & Decision</span>
            </div>

            {filteredPending.map((p) => (
              <TimesheetApprovalRowItem
                key={p.id}
                p={p}
                onApprove={() => onApprove(p.id)}
                onReject={() => onOpenReject(p)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-component: Individual Approval Row with Expandable Breakdown ────────
const TimesheetApprovalRowItem: React.FC<{
  p: PendingItem;
  onApprove: () => Promise<void>;
  onReject: () => void;
}> = ({ p, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);

  const name = p.applicant_name || p.applicant_email?.split('@')[0] || 'Employee';
  const initial = name.charAt(0).toUpperCase();
  const hoursNum = parseFloat(p.total_hours || '0');
  const entriesCount = p.entries?.length || 0;

  const handleApproveClick = async () => {
    setApproving(true);
    try {
      await onApprove();
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="hover:bg-slate-50/50 transition-colors">
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Employee Info */}
        <div className="w-full md:w-1/3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 text-xs truncate">{name}</p>
            <p className="text-[11px] text-slate-400 font-medium truncate">{p.applicant_email}</p>
          </div>
        </div>

        {/* Period Range */}
        <div className="w-full md:w-1/4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Calendar size={13} className="text-slate-400" />
            <span>{fmtWeekRange(p.week_start, p.week_end)}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
            Submitted for supervisor review
          </span>
        </div>

        {/* Logged Hours Status */}
        <div className="w-full md:w-1/6 flex flex-col items-start md:items-center">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${
            hoursNum >= 40
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Clock size={12} />
            {hoursNum.toFixed(1)} hrs
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
            {hoursNum >= 40 ? 'Standard Quota Met' : `${(40 - hoursNum).toFixed(1)}h Below Quota`}
          </span>
        </div>

        {/* Action Buttons & Expand Toggle */}
        <div className="w-full md:w-1/4 flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
          {entriesCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs"
              title="Toggle task breakdown"
            >
              <FileText size={13} />
              <span>{expanded ? 'Hide' : 'Review'}</span>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}

          <button
            onClick={handleApproveClick}
            disabled={approving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-2xs disabled:opacity-50"
          >
            {approving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Approve
          </button>

          <button
            onClick={onReject}
            disabled={approving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-2xs"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Expandable Breakdown Drawer */}
      {expanded && p.entries && p.entries.length > 0 && (
        <div className="px-6 pb-4 pt-1 bg-slate-50/40 border-t border-slate-100 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Detailed Project & Task Breakdown ({p.entries.length} items)
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Mon – Sun Hours Distribution
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {p.entries.map((entry, idx) => {
                const total = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].reduce(
                  (sum, d) => sum + (parseFloat((entry as any)[`${d}_hours`]) || 0),
                  0
                );
                return (
                  <div key={idx} className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-800 text-xs truncate">
                        {entry.project_name || 'General Project'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {entry.task_desc || 'No task description provided'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map(d => {
                        const h = parseFloat((entry as any)[`${d}_hours`]) || 0;
                        return (
                          <span
                            key={d}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              h > 0
                                ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-100'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {d.slice(0, 1).toUpperCase()}: {h > 0 ? h : '—'}
                          </span>
                        );
                      })}
                      <span className="ml-2 font-black text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded text-[11px]">
                        {total.toFixed(1)}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
