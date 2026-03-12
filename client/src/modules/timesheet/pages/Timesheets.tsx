import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, ChevronLeft, ChevronRight, Plus, Trash2,
  CheckCircle2, AlertTriangle, Send, LayoutGrid,
  History, Users, RefreshCw, Info, Zap, TrendingUp,
  CalendarDays, Target, BarChart2, XCircle
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ── constants & helpers ───────────────────────────────────────────────────────

const DEMO_USER   = '44444444-4444-4444-4444-444444444444';
const DAYS        = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EXPECTED_HRS = 40;
type DayKey = typeof DAYS[number];

function getMondayOf(date: Date): string {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function toDateStr(iso: string): string  { return iso ? iso.slice(0, 10) : ''; }

function fmtDate(iso: string): string {
  const s = toDateStr(iso);
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function fmtWeekRange(start: string, end: string): string {
  const s = toDateStr(start), e = toDateStr(end);
  if (!s || !e) return '—';
  const yr = new Date(s + 'T00:00:00').getFullYear();
  return `${fmtDate(s)} – ${fmtDate(e)}, ${isNaN(yr) ? '' : yr}`;
}

/** Dates for Mon…Sun of a week, returned as YYYY-MM-DD strings */
function weekDates(weekStart: string): string[] {
  const s = toDateStr(weekStart);
  return DAYS.map((_, i) => {
    const d = new Date(s + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

// ── types ─────────────────────────────────────────────────────────────────────

interface EntryRow {
  id?: string;
  project_name: string;
  task_desc: string;
  mon_hours: string;
  tue_hours: string;
  wed_hours: string;
  thu_hours: string;
  fri_hours: string;
  sat_hours: string;
  sun_hours: string;
}

interface Timesheet {
  id: string;
  week_start: string;
  week_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_hours: string;
  remarks?: string;
  entries: EntryRow[];
}

interface HistoryItem {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  total_hours: string;
  remarks?: string;
}

interface PendingItem {
  id: string;
  week_start: string;
  week_end: string;
  total_hours: string;
  applicant_email: string;
  employee_id?: string;
  designation?: string;
}

const blankRow = (): EntryRow => ({
  project_name: '',
  task_desc: '',
  mon_hours: '0', tue_hours: '0', wed_hours: '0', thu_hours: '0',
  fri_hours: '0', sat_hours: '0', sun_hours: '0',
});

// ── sub-components ────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    draft:     'bg-slate-100 text-slate-600',
    submitted: 'bg-amber-100 text-amber-700',
    approved:  'bg-emerald-100 text-emerald-700',
    rejected:  'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const Timesheets: React.FC = () => {
  const { user }   = useAuthStore();
  const userId     = (user?.id && user.id.length === 36) ? user.id : DEMO_USER;
  const isManager  = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState<'my' | 'history' | 'approvals'>('my');

  // ── week state ─────────────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));

  const prevWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().slice(0, 10));
  };

  // ── sheet state ────────────────────────────────────────────────────────────
  const [sheet,       setSheet]       = useState<Timesheet | null>(null);
  const [rows,        setRows]        = useState<EntryRow[]>([blankRow()]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [feedback,    setFeedback]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // ── history state ──────────────────────────────────────────────────────────
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [histFilter,  setHistFilter]  = useState<string>('all');
  const [histLoading, setHistLoading] = useState(false);

  // ── approvals state ────────────────────────────────────────────────────────
  const [pending,    setPending]    = useState<PendingItem[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ── computed stats ─────────────────────────────────────────────────────────
  const loggedHours = useMemo(
    () => rows.reduce((sum, r) => sum + DAYS.reduce((s, d) => s + (parseFloat(r[`${d}_hours`]) || 0), 0), 0),
    [rows]
  );
  const overtime         = Math.max(0, loggedHours - EXPECTED_HRS);
  const shortfall        = Math.max(0, EXPECTED_HRS - loggedHours);
  const progressPct      = Math.min(100, (loggedHours / EXPECTED_HRS) * 100);
  const dayTotals        = DAYS.map(d => rows.reduce((s, r) => s + (parseFloat(r[`${d}_hours`]) || 0), 0));
  const dates            = useMemo(() => weekDates(weekStart), [weekStart]);
  const today            = new Date().toISOString().slice(0, 10);
  const isCurrentWeek    = dates.includes(today);
  const isLocked         = sheet?.status === 'submitted' || sheet?.status === 'approved';

  // ── smart alerts ───────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const a: { msg: string; severity: 'rose' | 'amber' | 'blue' }[] = [];
    if (!sheet) return a;

    // Missing hours on weekdays (Mon-Fri) that have already passed
    dates.slice(0, 5).forEach((dateStr, i) => {
      if (dateStr <= today && dayTotals[i] === 0) {
        a.push({ msg: `Missing entry for ${DAY_LABELS[i]}, ${fmtDate(dateStr)}`, severity: 'rose' });
      }
    });

    if (sheet.status === 'draft' && loggedHours > 0 && isCurrentWeek) {
      const fridayDate = dates[4];
      if (today >= fridayDate) {
        a.push({ msg: 'Timesheet not yet submitted. Submit before end of day.', severity: 'amber' });
      }
    }
    if (sheet.status === 'rejected' && sheet.remarks) {
      a.push({ msg: `Rejected: ${sheet.remarks}`, severity: 'rose' });
    }
    return a;
  }, [sheet, dates, today, dayTotals, loggedHours, isCurrentWeek]);

  // ── load week ──────────────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const { data } = await api.get('/timesheets/week', { params: { userId, weekStart } });
      setSheet(data);
      if (data.entries?.length > 0) {
        setRows(data.entries.map((e: any) => ({
          id:           e.id,
          project_name: e.project_name,
          task_desc:    e.task_desc || '',
          mon_hours:    String(e.mon_hours),
          tue_hours:    String(e.tue_hours),
          wed_hours:    String(e.wed_hours),
          thu_hours:    String(e.thu_hours),
          fri_hours:    String(e.fri_hours),
          sat_hours:    String(e.sat_hours),
          sun_hours:    String(e.sun_hours),
        })));
      } else {
        setRows([blankRow()]);
      }
    } catch {
      setFeedback({ type: 'err', msg: 'Failed to load timesheet.' });
    } finally {
      setLoading(false);
    }
  }, [userId, weekStart]);

  // ── load history ───────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data } = await api.get('/timesheets', { params: { userId } });
      setHistory(data.items || []);
    } catch { /* ignore */ } finally { setHistLoading(false); }
  }, [userId]);

  // ── load pending ───────────────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    setAppLoading(true);
    try {
      const { data } = await api.get('/timesheets/pending');
      setPending(data.items || []);
    } catch { /* ignore */ } finally { setAppLoading(false); }
  }, []);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => { if (activeTab === 'history')   loadHistory(); }, [activeTab, loadHistory]);
  useEffect(() => { if (activeTab === 'approvals') loadPending(); }, [activeTab, loadPending]);

  // ── auto-fill from attendance ──────────────────────────────────────────────
  const autoFill = async () => {
    if (!sheet || isLocked) return;
    setAutoFilling(true);
    try {
      const weekEnd = dates[6];
      const { data } = await api.get('/attendance/weekly-hours', {
        params: { userId, weekStart: toDateStr(sheet.week_start), weekEnd }
      });
      const dayMap: Record<string, number> = data.days || {};

      // Map 'YYYY-MM-DD' → DayKey
      const dateToKey: Record<string, DayKey> = {};
      dates.forEach((d, i) => { dateToKey[d] = DAYS[i]; });

      // If we already have rows, update/add an "Attendance" row
      const attRow = blankRow();
      attRow.project_name = 'Work Hours (from Attendance)';
      attRow.task_desc    = 'Auto-filled from check-in/out records';
      Object.entries(dayMap).forEach(([date, hrs]) => {
        const key = dateToKey[date];
        if (key) attRow[`${key}_hours`] = hrs.toFixed(2);
      });

      // Replace any existing auto-fill row or add at top
      setRows(prev => {
        const filtered = prev.filter(r => r.project_name !== 'Work Hours (from Attendance)');
        return [attRow, ...filtered];
      });
      setFeedback({ type: 'ok', msg: 'Hours auto-filled from your attendance records.' });
    } catch {
      setFeedback({ type: 'err', msg: 'Could not fetch attendance data for auto-fill.' });
    } finally {
      setAutoFilling(false);
    }
  };

  // ── row helpers ────────────────────────────────────────────────────────────
  const updateRow   = (idx: number, field: keyof EntryRow, val: string) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow      = () => setRows(prev => [...prev, blankRow()]);
  const removeRow   = (idx: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, i) => i !== idx)); };
  const rowTotal    = (r: EntryRow) => DAYS.reduce((s, d) => s + (parseFloat(r[`${d}_hours`]) || 0), 0);

  // ── save draft ─────────────────────────────────────────────────────────────
  const buildPayload = () => rows
    .filter(r => r.project_name.trim())
    .map(r => ({
      project_name: r.project_name, task_desc: r.task_desc,
      mon_hours: parseFloat(r.mon_hours) || 0,
      tue_hours: parseFloat(r.tue_hours) || 0,
      wed_hours: parseFloat(r.wed_hours) || 0,
      thu_hours: parseFloat(r.thu_hours) || 0,
      fri_hours: parseFloat(r.fri_hours) || 0,
      sat_hours: parseFloat(r.sat_hours) || 0,
      sun_hours: parseFloat(r.sun_hours) || 0,
    }));

  const saveDraft = async () => {
    if (!sheet) return;
    setSaving(true); setFeedback(null);
    try {
      await api.put(`/timesheets/${sheet.id}/entries`, { entries: buildPayload() });
      setFeedback({ type: 'ok', msg: 'Draft saved.' });
      loadWeek();
    } catch {
      setFeedback({ type: 'err', msg: 'Failed to save draft.' });
    } finally { setSaving(false); }
  };

  const submitSheet = async () => {
    if (!sheet) return;
    if (buildPayload().length === 0) {
      setFeedback({ type: 'err', msg: 'Add at least one project entry before submitting.' });
      return;
    }
    setSaving(true); setFeedback(null);
    try {
      await api.put(`/timesheets/${sheet.id}/entries`, { entries: buildPayload() });
      await api.put(`/timesheets/${sheet.id}/submit`);
      setFeedback({ type: 'ok', msg: 'Submitted for approval!' });
      loadWeek();
    } catch {
      setFeedback({ type: 'err', msg: 'Failed to submit.' });
    } finally { setSaving(false); }
  };

  // ── approve/reject ─────────────────────────────────────────────────────────
  const handleApproval = async (id: string, action: 'approved' | 'rejected') => {
    setApprovingId(id);
    try {
      await api.put(`/timesheets/${id}/approve`, { action, approved_by: userId });
      loadPending();
    } finally { setApprovingId(null); }
  };

  // ── filtered history ───────────────────────────────────────────────────────
  const filteredHistory = histFilter === 'all' ? history : history.filter(h => h.status === histFilter);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f4f7f9] font-sans overflow-hidden">

      {/* ── Tab header bar ──────────────────────────────────────────────────── */}
      <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm flex-shrink-0">
        {([
          { key: 'my',        label: 'My Timesheet', icon: <Clock size={13} /> },
          { key: 'history',   label: 'History',      icon: <History size={13} /> },
          ...(isManager ? [{ key: 'approvals', label: 'Team Approvals', icon: <Users size={13} /> }] : []),
        ] as any[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`h-full flex items-center space-x-1.5 px-4 text-[13px] font-medium border-b-2 transition-colors mr-1
              ${activeTab === tab.key
                ? 'border-blue-400 text-white font-bold'
                : 'border-transparent text-slate-300 hover:text-white'}`}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  MY TIMESHEET                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'my' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Week navigator ─────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-3 flex items-center justify-between">
            <button onClick={prevWeek} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[13px] font-black text-slate-800">
                {sheet ? fmtWeekRange(sheet.week_start, sheet.week_end) : weekStart ? fmtWeekRange(weekStart, dates[6]) : '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest">
                {isCurrentWeek ? 'Current Week' : 'Past Week'}
              </p>
            </div>
            <button onClick={nextWeek} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* ── Stats row ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Logged Hours',
                val: loggedHours.toFixed(2),
                total: EXPECTED_HRS,
                unit: 'hrs',
                color: 'blue',
                icon: <Clock size={15} className="text-blue-500" />,
                bar: progressPct,
              },
              {
                label: 'Expected Hours',
                val: EXPECTED_HRS.toFixed(1),
                total: EXPECTED_HRS,
                unit: 'hrs',
                color: 'slate',
                icon: <Target size={15} className="text-slate-400" />,
                bar: 100,
              },
              {
                label: 'Overtime',
                val: overtime.toFixed(2),
                total: 10,
                unit: 'hrs',
                color: 'amber',
                icon: <Zap size={15} className="text-amber-500" />,
                bar: Math.min(100, (overtime / 10) * 100),
              },
              {
                label: 'Completion',
                val: progressPct.toFixed(0),
                total: 100,
                unit: '%',
                color: progressPct >= 100 ? 'emerald' : 'indigo',
                icon: <BarChart2 size={15} className={progressPct >= 100 ? 'text-emerald-500' : 'text-indigo-500'} />,
                bar: progressPct,
              },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                  {stat.icon}
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className={`text-2xl font-black text-${stat.color === 'slate' ? 'slate-800' : stat.color + '-600'}`}>
                    {stat.val}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">{stat.unit}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500
                      ${stat.color === 'slate' ? 'bg-slate-300' : `bg-${stat.color}-500`}`}
                    style={{ width: `${stat.bar}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── Alerts + Status bar ────────────────────────────────────────── */}
          <div className="flex gap-4">

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-2">
                <div className="flex items-center space-x-2 text-rose-600 mb-1">
                  <AlertTriangle size={14} strokeWidth={2.5} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Active Alerts</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg
                    ${a.severity === 'rose' ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                      ${a.severity === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <span className={`text-[12px] font-semibold
                      ${a.severity === 'rose' ? 'text-rose-700' : 'text-amber-700'}`}>{a.msg}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Status + actions */}
            {sheet && (
              <div className={`bg-white rounded-lg border shadow-sm px-5 py-4 flex flex-col justify-between
                ${alerts.length > 0 ? 'w-72 flex-shrink-0' : 'flex-1'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sheet Status</span>
                  <StatusBadge status={sheet.status} />
                </div>
                <div className="flex items-center space-x-2">
                  {/* Total logged */}
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Logged</p>
                    <p className="text-xl font-black text-blue-600">{loggedHours.toFixed(2)}<span className="text-xs font-bold text-slate-400 ml-1">hrs</span></p>
                  </div>
                  {shortfall > 0 && (
                    <div className="flex-1 bg-rose-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-rose-400 uppercase font-bold">Shortfall</p>
                      <p className="text-xl font-black text-rose-600">{shortfall.toFixed(2)}<span className="text-xs font-bold text-rose-400 ml-1">hrs</span></p>
                    </div>
                  )}
                  {overtime > 0 && (
                    <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-amber-400 uppercase font-bold">Overtime</p>
                      <p className="text-xl font-black text-amber-600">{overtime.toFixed(2)}<span className="text-xs font-bold text-amber-400 ml-1">hrs</span></p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div className={`rounded-lg px-4 py-3 text-[13px] font-semibold flex items-center space-x-2
              ${feedback.type === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              {feedback.type === 'ok' ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              <span>{feedback.msg}</span>
              <button onClick={() => setFeedback(null)} className="ml-auto opacity-60 hover:opacity-100">
                <XCircle size={14} />
              </button>
            </div>
          )}

          {/* ── Main entry grid ────────────────────────────────────────────── */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">

            {/* Grid toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarDays size={14} className="text-slate-400" />
                <h3 className="text-[13px] font-black text-slate-700">Timesheet Entry</h3>
                {sheet && <StatusBadge status={sheet.status} />}
              </div>
              <div className="flex items-center space-x-2">
                {!isLocked && (
                  <button
                    onClick={autoFill}
                    disabled={autoFilling}
                    className="flex items-center space-x-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors disabled:opacity-50"
                  >
                    <Zap size={13} />
                    <span>{autoFilling ? 'Filling...' : 'Auto-fill from Attendance'}</span>
                  </button>
                )}
                {!isLocked && (
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-[11px] font-black uppercase hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                )}
                {!isLocked && (
                  <button
                    onClick={submitSheet}
                    disabled={saving}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-md text-[11px] font-black uppercase shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send size={12} />
                    <span>{saving ? 'Submitting...' : 'Submit for Approval'}</span>
                  </button>
                )}
                {isLocked && (
                  <span className="text-[12px] text-slate-400 italic">
                    {sheet?.status === 'approved' ? '✅ Approved — read only' : '⏳ Awaiting approval'}
                  </span>
                )}
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading timesheet…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="p-3 w-52">Project</th>
                      <th className="p-3 w-44">Task / Description</th>
                      {DAYS.map((_, i) => {
                        const d    = new Date(toDateStr(weekStart) + 'T00:00:00');
                        d.setDate(d.getDate() + i);
                        const isToday = d.toISOString().slice(0, 10) === today;
                        const isWknd  = i >= 5;
                        return (
                          <th key={i} className={`p-3 text-center w-20
                            ${isToday ? 'text-blue-600' : isWknd ? 'text-slate-300' : ''}`}>
                            {DAY_LABELS[i]} {d.getDate()}
                            {isToday && <span className="block text-[9px] uppercase tracking-widest text-blue-400">Today</span>}
                          </th>
                        );
                      })}
                      <th className="p-3 text-center w-20">Total</th>
                      {!isLocked && <th className="p-3 w-8" />}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-50">
                    {rows.map((row, idx) => {
                      const rt = rowTotal(row);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.project_name}
                              onChange={e => updateRow(idx, 'project_name', e.target.value)}
                              disabled={isLocked}
                              placeholder="Project name"
                              className="w-full text-[13px] font-semibold text-slate-800 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-500 placeholder-slate-300"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.task_desc}
                              onChange={e => updateRow(idx, 'task_desc', e.target.value)}
                              disabled={isLocked}
                              placeholder="Description"
                              className="w-full text-[12px] text-slate-600 border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 disabled:bg-slate-50 placeholder-slate-300"
                            />
                          </td>
                          {DAYS.map((d, di) => {
                            const val = parseFloat(row[`${d}_hours`]) || 0;
                            const isWknd = di >= 5;
                            return (
                              <td key={d} className="p-1.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  value={row[`${d}_hours`]}
                                  onChange={e => updateRow(idx, `${d}_hours`, e.target.value)}
                                  disabled={isLocked}
                                  className={`w-full text-center text-[13px] font-semibold rounded-md border py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-colors
                                    ${isLocked ? 'bg-slate-50 text-slate-400 border-slate-100' :
                                      val > 0   ? 'border-blue-200 bg-blue-50 text-blue-700' :
                                      isWknd    ? 'border-slate-100 bg-slate-50 text-slate-300' :
                                                  'border-slate-200 text-slate-400'}`}
                                />
                              </td>
                            );
                          })}
                          <td className="p-2 text-center">
                            <span className={`text-[13px] font-black ${rt > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                              {rt.toFixed(2)}
                            </span>
                          </td>
                          {!isLocked && (
                            <td className="p-2">
                              <button
                                onClick={() => removeRow(idx)}
                                disabled={rows.length === 1}
                                className="p-1 text-slate-200 hover:text-rose-400 transition-colors disabled:opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Footer totals */}
                  <tfoot>
                    <tr className="bg-gradient-to-r from-slate-50 to-blue-50/30 border-t-2 border-slate-100">
                      <td colSpan={2} className="p-3">
                        {!isLocked && (
                          <button
                            onClick={addRow}
                            className="flex items-center space-x-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Plus size={14} />
                            <span>Add Project Row</span>
                          </button>
                        )}
                      </td>
                      {dayTotals.map((t, i) => (
                        <td key={i} className={`p-3 text-center text-[12px] font-black
                          ${t > 8 ? 'text-amber-600' : t > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {t > 0 ? t.toFixed(1) : '—'}
                          {t > 8 && <span className="block text-[9px] text-amber-500">OT</span>}
                        </td>
                      ))}
                      <td className="p-3 text-center">
                        <span className={`text-[14px] font-black ${loggedHours >= EXPECTED_HRS ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {loggedHours.toFixed(2)}
                        </span>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">/ {EXPECTED_HRS} hrs</span>
                      </td>
                      {!isLocked && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-5 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Weekly Progress</span>
              <span className="text-[12px] font-black text-slate-700">
                {loggedHours.toFixed(2)} / {EXPECTED_HRS} hrs
                {loggedHours >= EXPECTED_HRS && <span className="ml-2 text-emerald-600">✓ Goal met</span>}
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700
                  ${loggedHours >= EXPECTED_HRS ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  HISTORY                                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Filter tabs */}
          <div className="flex items-center space-x-2">
            {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setHistFilter(f)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-bold capitalize transition-colors
                  ${histFilter === f ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
            <button onClick={loadHistory} className="ml-auto p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center space-x-2">
              <History size={14} className="text-slate-400" />
              <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">
                Timesheet History ({filteredHistory.length})
              </h3>
            </div>

            {histLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No timesheets found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4 text-left">Week</th>
                    <th className="p-4 text-center">Total Logged</th>
                    <th className="p-4 text-center">vs Expected</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredHistory.map(h => {
                    const hrs  = parseFloat(h.total_hours) || 0;
                    const diff = hrs - EXPECTED_HRS;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 font-semibold text-slate-800">{fmtWeekRange(h.week_start, h.week_end)}</td>
                        <td className="p-4 text-center font-black text-blue-600">{hrs.toFixed(2)} hrs</td>
                        <td className="p-4 text-center">
                          <span className={`text-[12px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(2)} hrs
                          </span>
                        </td>
                        <td className="p-4 text-center"><StatusBadge status={h.status} /></td>
                        <td className="p-4 text-slate-500 text-[12px]">{h.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/*  TEAM APPROVALS                                                       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'approvals' && isManager && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending Review', val: pending.length, color: 'amber', icon: <AlertTriangle size={16} className="text-amber-500" /> },
              { label: 'Reviewed Today', val: 0, color: 'emerald', icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
              { label: 'Total Team', val: pending.length, color: 'blue', icon: <Users size={16} className="text-blue-500" /> },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                  {s.icon}
                </div>
                <span className={`text-3xl font-black text-${s.color}-600`}>{s.val}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users size={14} className="text-slate-400" />
                <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">
                  Pending Approvals
                  {pending.length > 0 && (
                    <span className="ml-2 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{pending.length}</span>
                  )}
                </h3>
              </div>
              <button onClick={loadPending} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>

            {appLoading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>
            ) : pending.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center space-y-3">
                <CheckCircle2 size={40} className="text-emerald-400" />
                <p className="text-slate-500 font-semibold">All timesheets reviewed. You're all caught up!</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-4 text-left">Employee</th>
                    <th className="p-4 text-left">Week</th>
                    <th className="p-4 text-center">Logged</th>
                    <th className="p-4 text-center">vs Expected</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pending.map(p => {
                    const hrs  = parseFloat(p.total_hours) || 0;
                    const diff = hrs - EXPECTED_HRS;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{p.applicant_email}</p>
                          {p.employee_id && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{p.employee_id} · {p.designation}</p>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 text-[13px]">{fmtWeekRange(p.week_start, p.week_end)}</td>
                        <td className="p-4 text-center font-black text-blue-600">{hrs.toFixed(2)} hrs</td>
                        <td className="p-4 text-center">
                          <span className={`text-[12px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {diff >= 0 ? '+' : ''}{diff.toFixed(2)} hrs
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleApproval(p.id, 'approved')}
                              disabled={approvingId === p.id}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-[12px] font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleApproval(p.id, 'rejected')}
                              disabled={approvingId === p.id}
                              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-md text-[12px] font-bold hover:bg-rose-700 transition-colors disabled:opacity-50"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Timesheets;
