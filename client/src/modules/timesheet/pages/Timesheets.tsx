import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, ChevronLeft, ChevronRight, Plus, Trash2,
  CheckCircle2, Send, History, 
  Users, Info, Zap, CalendarDays, 
  Target, BarChart2, XCircle,
  Database, Loader2, Sparkles, Calendar,
  TrendingUp, ShieldCheck, Check, ArrowRight,
  AlertCircle, Save, FolderGit2
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ── Constants & Timezone-Safe Date Helpers ──────────────────────────────────
const DAYS        = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EXPECTED_HRS = 40;
type DayKey = typeof DAYS[number];

function toLocalDateStr(d: Date): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(str: string): Date {
  if (!str) return new Date();
  const clean = str.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function getMondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = parseLocalDate(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDayHeaderDate(iso: string): string {
  if (!iso) return '';
  const d = parseLocalDate(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function fmtWeekRange(start: string, end: string): string {
  if (!start || !end) return '—';
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  return `${fmtDate(start)} – ${fmtDate(end)}, ${e.getFullYear()}`;
}

function weekDates(weekStart: string): string[] {
  return DAYS.map((_, i) => {
    const d = parseLocalDate(weekStart);
    d.setDate(d.getDate() + i);
    return toLocalDateStr(d);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
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
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  week_start: string; 
  week_end: string; 
  total_hours: string;
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
  applicant_name?: string;
}

const blankRow = (): EntryRow => ({
  project_name: '', 
  task_desc: '',
  mon_hours: '0', 
  tue_hours: '0', 
  wed_hours: '0', 
  thu_hours: '0',
  fri_hours: '0', 
  sat_hours: '0', 
  sun_hours: '0',
});

// ── Main Component ────────────────────────────────────────────────────────────
const Timesheets: React.FC = () => {
  const { user }   = useAuthStore();
  const userId     = user?.id;
  const isManager  = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager' || user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<'my' | 'history' | 'approvals'>('my');
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  const [sheet,       setSheet]       = useState<Timesheet | null>(null);
  const [rows,        setRows]        = useState<EntryRow[]>([blankRow()]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [feedback,    setFeedback]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [histFilter,  setHistFilter]  = useState<string>('all');
  const [histLoading, setHistLoading] = useState(false);

  const [pending,     setPending]    = useState<PendingItem[]>([]);
  const [appLoading,  setAppLoading] = useState(false);

  // ── Computed Stats ─────────────────────────────────────────────────────────
  const loggedHours = useMemo(() => 
    rows.reduce((sum, r) => sum + DAYS.reduce((s, d) => s + (parseFloat(r[`${d}_hours`]) || 0), 0), 0), 
    [rows]
  );
  const progressPct = Math.min(100, (loggedHours / EXPECTED_HRS) * 100);
  const dayTotals   = DAYS.map(d => rows.reduce((s, r) => s + (parseFloat(r[`${d}_hours`]) || 0), 0));
  const dates       = useMemo(() => weekDates(weekStart), [weekStart]);
  const today       = toLocalDateStr(new Date());
  const currentWeekMonday = getMondayOf(new Date());
  const isCurrentWeek = weekStart === currentWeekMonday;
  const isLocked    = sheet?.status === 'submitted' || sheet?.status === 'approved';

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    setLoading(true); 
    setFeedback(null);
    try {
      const { data } = await api.get('/timesheets/week', { params: { userId, weekStart } });
      setSheet(data);
      if (data.entries?.length > 0) {
        setRows(data.entries.map((e: any) => ({
          id: e.id, 
          project_name: e.project_name, 
          task_desc: e.task_desc || '',
          mon_hours: String(e.mon_hours ?? 0), 
          tue_hours: String(e.tue_hours ?? 0), 
          wed_hours: String(e.wed_hours ?? 0),
          thu_hours: String(e.thu_hours ?? 0), 
          fri_hours: String(e.fri_hours ?? 0), 
          sat_hours: String(e.sat_hours ?? 0), 
          sun_hours: String(e.sun_hours ?? 0),
        })));
      } else { 
        setRows([blankRow()]); 
      }
    } catch { 
      setFeedback({ type: 'err', msg: 'Failed to load timesheet matrix for this period.' }); 
    } finally { 
      setLoading(false); 
    }
  }, [userId, weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  useEffect(() => {
    if (activeTab === 'history') {
      const loadHistory = async () => {
        setHistLoading(true);
        try { 
          const { data } = await api.get('/timesheets', { params: { userId } }); 
          setHistory(data.items || []); 
        } catch { 
          /* ignore */ 
        } finally { 
          setHistLoading(false); 
        }
      };
      loadHistory();
    }
    if (activeTab === 'approvals') {
      const loadPending = async () => {
        setAppLoading(true);
        try { 
          const { data } = await api.get('/timesheets/pending'); 
          setPending(data.items || []); 
        } catch { 
          /* ignore */ 
        } finally { 
          setAppLoading(false); 
        }
      };
      loadPending();
    }
  }, [activeTab, userId]);

  // ── Methods ────────────────────────────────────────────────────────────────
  const autoFill = async () => {
    if (!sheet || isLocked) return;
    setAutoFilling(true);
    try {
      const { data } = await api.get('/attendance/weekly-hours', { 
        params: { userId, weekStart: weekStart, weekEnd: dates[6] } 
      });
      const dayMap: Record<string, number> = data.days || {};
      const attRow = blankRow();
      attRow.project_name = 'Protocol Verification (Attendance)';
      attRow.task_desc    = 'Synchronized from biometric check-in/out telemetry';
      dates.forEach((d, i) => { 
        if (dayMap[d]) attRow[`${DAYS[i]}_hours`] = dayMap[d].toFixed(1); 
      });
      setRows(prev => [attRow, ...prev.filter(r => r.project_name !== 'Protocol Verification (Attendance)')]);
      setFeedback({ type: 'ok', msg: 'Hours synchronized with attendance telemetry.' });
    } catch { 
      setFeedback({ type: 'err', msg: 'Telemetry sync failed. Please enter hours manually.' }); 
    } finally { 
      setAutoFilling(false); 
    }
  };

  const fillStandardPreset = () => {
    if (isLocked) return;
    setRows(prev => {
      const targetRow = prev.length > 0 && !prev[0].project_name ? 0 : -1;
      const updated = [...prev];
      if (targetRow === 0) {
        updated[0] = {
          ...updated[0],
          project_name: 'Core Operations / Engineering',
          task_desc: 'Standard 40h weekly allocation',
          mon_hours: '8', tue_hours: '8', wed_hours: '8', thu_hours: '8', fri_hours: '8', sat_hours: '0', sun_hours: '0',
        };
      } else {
        updated.push({
          project_name: 'Core Operations / Engineering',
          task_desc: 'Standard 40h weekly allocation',
          mon_hours: '8', tue_hours: '8', wed_hours: '8', thu_hours: '8', fri_hours: '8', sat_hours: '0', sun_hours: '0',
        });
      }
      return updated;
    });
    setFeedback({ type: 'ok', msg: 'Standard 40h template (8h Mon–Fri) applied.' });
  };

  const save = async (isSubmit = false) => {
    if (!sheet) return;
    const payload = rows.filter(r => r.project_name.trim()).map(r => ({
      project_name: r.project_name, 
      task_desc: r.task_desc,
      mon_hours: parseFloat(r.mon_hours) || 0, 
      tue_hours: parseFloat(r.tue_hours) || 0, 
      wed_hours: parseFloat(r.wed_hours) || 0,
      thu_hours: parseFloat(r.thu_hours) || 0, 
      fri_hours: parseFloat(r.fri_hours) || 0, 
      sat_hours: parseFloat(r.sat_hours) || 0, 
      sun_hours: parseFloat(r.sun_hours) || 0,
    }));
    if (isSubmit && payload.length === 0) {
      return setFeedback({ type: 'err', msg: 'Please add at least one project line before submitting.' });
    }
    setSaving(true);
    try {
      await api.put(`/timesheets/${sheet.id}/entries`, { entries: payload });
      if (isSubmit) {
        await api.put(`/timesheets/${sheet.id}/submit`);
      }
      setFeedback({ 
        type: 'ok', 
        msg: isSubmit ? 'Timesheet submitted for executive approval.' : 'Draft timesheet saved successfully.' 
      });
      loadWeek();
    } catch { 
      setFeedback({ type: 'err', msg: 'Failed to commit timesheet entries. Please check your connection.' }); 
    } finally { 
      setSaving(false); 
    }
  };

  const updateRow = (idx: number, field: keyof EntryRow, val: string) => {
    setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };
  const addRow = () => setRows(p => [...p, blankRow()]);
  const removeRow = (idx: number) => { 
    if (rows.length > 1) {
      setRows(p => p.filter((_, i) => i !== idx)); 
    } else {
      setRows([blankRow()]);
    }
  };

  // ── Modern Status Badge ────────────────────────────────────────────────────
  const StatusBadge = ({ s }: { s: string }) => {
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

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto page-enter">
      
      {/* ── Page Header (Clean, Matching System Aesthetic) ───────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/25 flex-shrink-0">
            <Clock size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[20px] font-black text-slate-900 tracking-tight">Timesheets</h2>
              {sheet && <StatusBadge s={sheet.status} />}
            </div>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-0.5">
              Track and submit your weekly project hours
            </p>
          </div>
        </div>

        {/* Week Navigator Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setWeekStart(currentWeekMonday)} 
            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm flex items-center gap-2 ${
              isCurrentWeek 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={14} />
            This Week
          </button>

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
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

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Logged Hours */}
        <div className="bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Clock size={16} strokeWidth={2.5}/>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {progressPct >= 100 ? 'Quota Met' : `${(40 - loggedHours).toFixed(1)}h left`}
            </span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-indigo-600 tracking-tight leading-none">
                {loggedHours.toFixed(1)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                / 40.0 hrs
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
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Weekly Pace */}
        <div className="bg-white rounded-2xl border border-slate-100 hover:border-blue-200 p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <TrendingUp size={16} strokeWidth={2.5}/>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              progressPct >= 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
              progressPct >= 75  ? 'bg-blue-50 text-blue-700 border-blue-100' :
              progressPct > 0    ? 'bg-amber-50 text-amber-700 border-amber-100' :
              'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
              {progressPct >= 100 ? 'Target Met' : progressPct >= 75 ? 'On Track' : progressPct > 0 ? 'In Progress' : 'No Hours'}
            </span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-slate-800 tracking-tight leading-none">
                {progressPct.toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Pace
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
              Completion Rate
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>Standard 8h/day</span>
              <span className="font-mono text-slate-600 font-bold">5 Days</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-700 ease-out" 
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Standard Target */}
        <div className="bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Target size={16} strokeWidth={2.5}/>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              8.0h / Day
            </span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-emerald-600 tracking-tight leading-none">
                40.0
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                hours / wk
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
              Target Quota
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>Mon – Fri Standard</span>
              <span className="font-mono text-emerald-600 font-bold">100%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full" 
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Sheet Status */}
        <div className="bg-white rounded-2xl border border-slate-100 hover:border-amber-200 p-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <ShieldCheck size={16} strokeWidth={2.5}/>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {isLocked ? 'Locked' : 'Editable'}
            </span>
          </div>
          <div className="my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[24px] font-black text-slate-800 tracking-tight leading-none capitalize">
                {sheet?.status === 'submitted' ? 'Submitted' : sheet?.status || 'Draft'}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
              Workflow Status
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              <span>{isLocked ? 'Awaiting supervisor' : 'Changes allowed'}</span>
              <span className="font-mono text-slate-600 font-bold">
                {sheet?.status === 'approved' ? '100%' : sheet?.status === 'submitted' ? '65%' : '20%'}
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  sheet?.status === 'approved' ? 'bg-emerald-500' :
                  sheet?.status === 'submitted' ? 'bg-amber-500' : 'bg-slate-400'
                }`} 
                style={{ width: sheet?.status === 'approved' ? '100%' : sheet?.status === 'submitted' ? '65%' : '20%' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── Navigation Tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 w-fit">
        <button 
          onClick={() => setActiveTab('my')} 
          className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'my'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <CalendarDays size={13} />
          Weekly Timesheet
        </button>

        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          <History size={13} />
          History
          {history.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[9px] font-black">
              {history.length}
            </span>
          )}
        </button>

        {isManager && (
          <button 
            onClick={() => setActiveTab('approvals')} 
            className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === 'approvals'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users size={13} />
            Approvals
            {pending.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black">
                {pending.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Main Content Section ─────────────────────────────────────────── */}
      <div>
        {activeTab === 'my' && (
          <div className="space-y-6">
            
            {/* The Unified Timesheet Matrix Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              
              {/* Card Header & Action Toolbar */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
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

              {/* Feedback toast / notification */}
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

            {/* ── Visual Daily Distribution & Guidelines ───────────────────── */}
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
                    {/* 8h Target Guideline */}
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
                            
                            {/* Bar Track & Fill */}
                            <div className="w-8 h-20 flex items-end justify-center">
                              {total > 0 ? (
                                <div 
                                  className={`w-full rounded-t-lg transition-all duration-500 shadow-xs ${
                                    isTodayCol ? 'bg-indigo-600' : total >= 8 ? 'bg-indigo-500' : 'bg-indigo-300'
                                  }`} 
                                  style={{ height: `${pct}%`, minHeight: '6px' }}
                                />
                              ) : (
                                <div className="w-full h-1 bg-slate-200/80 rounded-full" />
                              )}
                            </div>
                            
                            {/* Day and Date Label */}
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
                    {/* Item 1 */}
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

                    {/* Item 2 */}
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

                    {/* Item 3 */}
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

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Standard Policy v2.4</span>
                  <span className="text-indigo-600 font-bold">Enterprise Mode</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ── History Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/40">
              <div className="flex items-center gap-3">
                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Submission History</h3>
                <span className="px-2.5 py-0.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500">
                  {history.length} records
                </span>
              </div>

              {/* Status Filter Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-xs">
                {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setHistFilter(f)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                      histFilter === f 
                        ? 'bg-indigo-600 text-white shadow-xs' 
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
                    {history.filter(h => histFilter === 'all' || h.status === histFilter).map(h => (
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
                            onClick={() => {
                              setWeekStart(h.week_start.slice(0, 10));
                              setActiveTab('my');
                            }}
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
        )}

        {/* ── Approvals Tab (Manager View) ─────────────────────────────────── */}
        {activeTab === 'approvals' && isManager && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div>
                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wider">Pending Unit Approvals</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Review and authorize team timesheet submissions</p>
              </div>
              {pending.length > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                  {pending.length} Action Required
                </span>
              )}
            </div>

            {appLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading pending submissions...</span>
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-800 uppercase tracking-wider">All Caught Up</p>
                  <p className="text-xs text-slate-400 mt-0.5">No pending timesheet submissions awaiting your sign-off.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/60 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Logged Hours</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {pending.map((p: any) => (
                      <TimesheetApprovalRow
                        key={p.id}
                        p={p}
                        userId={userId}
                        fmtWeekRange={fmtWeekRange}
                        onDone={() => setPending(prev => prev.filter(x => x.id !== p.id))}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

// ── Sub-component for Individual Approval Row ─────────────────────────────────
const TimesheetApprovalRow = ({ p, userId, fmtWeekRange, onDone }: any) => {
  const [actionState, setActionState] = useState<'idle' | 'loading'>('idle');

  const doAction = async (action: 'approved' | 'rejected') => {
    setActionState('loading');
    try {
      await api.put(`/timesheets/${p.id}/approve`, { action, approved_by: userId });
      onDone();
    } catch { 
      /* ignore */ 
    } finally { 
      setActionState('idle'); 
    }
  };

  const name = p.applicant_name || p.applicant_email?.split('@')[0] || 'Employee';
  const initial = name.charAt(0).toUpperCase();

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0">
            {initial}
          </div>
          <div>
            <p className="font-extrabold text-slate-900">{name}</p>
            <p className="text-[11px] text-slate-400 font-medium">{p.applicant_email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className="font-bold text-slate-700">{fmtWeekRange(p.week_start, p.week_end)}</span>
      </td>
      <td className="px-6 py-4">
        <span className="font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs">
          {parseFloat(p.total_hours || '0').toFixed(1)} hrs
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => doAction('approved')}
            disabled={actionState === 'loading'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
          >
            <Check size={13} /> Approve
          </button>
          <button
            onClick={() => doAction('rejected')}
            disabled={actionState === 'loading'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Timesheets;
