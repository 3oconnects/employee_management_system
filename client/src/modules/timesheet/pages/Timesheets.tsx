import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, ChevronLeft, ChevronRight, Plus, Trash2,
  CheckCircle2, AlertTriangle, Send, History, 
  Users, RefreshCw, Info, Zap, CalendarDays, 
  Target, BarChart2, XCircle, FileText,
  Search, Filter, Download, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

// ── constants & helpers ───────────────────────────────────────────────────────
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
  return `${fmtDate(s)} – ${fmtDate(e)}, ${new Date(s + 'T00:00:00').getFullYear()}`;
}
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
  id: string; status: 'draft' | 'submitted' | 'approved' | 'rejected';
  week_start: string; week_end: string; total_hours: string;
  entries: EntryRow[];
}
interface HistoryItem { id: string; week_start: string; week_end: string; status: string; total_hours: string; remarks?: string; }
interface PendingItem { id: string; week_start: string; week_end: string; total_hours: string; applicant_email: string; }

const blankRow = (): EntryRow => ({
  project_name: '', task_desc: '',
  mon_hours: '0', tue_hours: '0', wed_hours: '0', thu_hours: '0',
  fri_hours: '0', sat_hours: '0', sun_hours: '0',
});

// ── main component ────────────────────────────────────────────────────────────
const Timesheets: React.FC = () => {
  const { user }   = useAuthStore();
  const userId     = user?.id;
  const isManager  = user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager';

  const [activeTab, setActiveTab] = useState<'my' | 'history' | 'approvals'>('my');
  const [weekStart, setWeekStart] = useState(getMondayOf(new Date()));

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

  // ── computed stats ─────────────────────────────────────────────────────────
  const loggedHours = useMemo(() => rows.reduce((sum, r) => sum + DAYS.reduce((s, d) => s + (parseFloat(r[`${d}_hours`]) || 0), 0), 0), [rows]);
  const progressPct = Math.min(100, (loggedHours / EXPECTED_HRS) * 100);
  const dayTotals   = DAYS.map(d => rows.reduce((s, r) => s + (parseFloat(r[`${d}_hours`]) || 0), 0));
  const dates       = useMemo(() => weekDates(weekStart), [weekStart]);
  const today       = new Date().toISOString().slice(0, 10);
  const isCurrentWeek = dates.includes(today);
  const isLocked    = sheet?.status === 'submitted' || sheet?.status === 'approved';

  // ── loaders ────────────────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    setLoading(true); setFeedback(null);
    try {
      const { data } = await api.get('/timesheets/week', { params: { userId, weekStart } });
      setSheet(data);
      if (data.entries?.length > 0) {
        setRows(data.entries.map((e: any) => ({
          id: e.id, project_name: e.project_name, task_desc: e.task_desc || '',
          mon_hours: String(e.mon_hours), tue_hours: String(e.tue_hours), wed_hours: String(e.wed_hours),
          thu_hours: String(e.thu_hours), fri_hours: String(e.fri_hours), sat_hours: String(e.sat_hours), sun_hours: String(e.sun_hours),
        })));
      } else { setRows([blankRow()]); }
    } catch { setFeedback({ type: 'err', msg: 'Failed to load timesheet.' }); }
    finally { setLoading(false); }
  }, [userId, weekStart]);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => {
    if (activeTab === 'history') {
      const loadHistory = async () => {
        setHistLoading(true);
        try { const { data } = await api.get('/timesheets', { params: { userId } }); setHistory(data.items || []); }
        catch { /* ignore */ } finally { setHistLoading(false); }
      };
      loadHistory();
    }
    if (activeTab === 'approvals') {
      const loadPending = async () => {
        setAppLoading(true);
        try { const { data } = await api.get('/timesheets/pending'); setPending(data.items || []); }
        catch { /* ignore */ } finally { setAppLoading(false); }
      };
      loadPending();
    }
  }, [activeTab, userId]);

  // ── methods ────────────────────────────────────────────────────────────────
  const autoFill = async () => {
    if (!sheet || isLocked) return;
    setAutoFilling(true);
    try {
      const { data } = await api.get('/attendance/weekly-hours', { params: { userId, weekStart: toDateStr(sheet.week_start), weekEnd: dates[6] } });
      const dayMap: Record<string, number> = data.days || {};
      const attRow = blankRow();
      attRow.project_name = 'Work Hours (from Attendance)';
      attRow.task_desc    = 'Auto-filled from check-in/out records';
      dates.forEach((d, i) => { if (dayMap[d]) attRow[`${DAYS[i]}_hours`] = dayMap[d].toFixed(2); });
      setRows(prev => [attRow, ...prev.filter(r => r.project_name !== 'Work Hours (from Attendance)')]);
      setFeedback({ type: 'ok', msg: 'Hours auto-filled.' });
    } catch { setFeedback({ type: 'err', msg: 'Auto-fill failed.' }); } finally { setAutoFilling(false); }
  };

  const save = async (isSubmit = false) => {
    if (!sheet) return;
    const payload = rows.filter(r => r.project_name.trim()).map(r => ({
      project_name: r.project_name, task_desc: r.task_desc,
      mon_hours: parseFloat(r.mon_hours) || 0, tue_hours: parseFloat(r.tue_hours) || 0, wed_hours: parseFloat(r.wed_hours) || 0,
      thu_hours: parseFloat(r.thu_hours) || 0, fri_hours: parseFloat(r.fri_hours) || 0, sat_hours: parseFloat(r.sat_hours) || 0, sun_hours: parseFloat(r.sun_hours) || 0,
    }));
    if (isSubmit && payload.length === 0) return setFeedback({ type: 'err', msg: 'Add entries before submitting.' });
    setSaving(true);
    try {
      await api.put(`/timesheets/${sheet.id}/entries`, { entries: payload });
      if (isSubmit) await api.put(`/timesheets/${sheet.id}/submit`);
      setFeedback({ type: 'ok', msg: isSubmit ? 'Submitted for approval!' : 'Draft saved.' });
      loadWeek();
    } catch { setFeedback({ type: 'err', msg: 'Action failed.' }); } finally { setSaving(false); }
  };

  const updateRow = (idx: number, field: keyof EntryRow, val: string) => setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow = () => setRows(p => [...p, blankRow()]);
  const removeRow = (idx: number) => { if (rows.length > 1) setRows(p => p.filter((_, i) => i !== idx)); };

  const StatusBadge = ({ s }: { s: string }) => {
    const cls: any = { draft: 'bg-gray-100 text-gray-500', submitted: 'bg-amber-100 text-amber-600', approved: 'bg-emerald-100 text-emerald-600', rejected: 'bg-rose-100 text-rose-600' };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cls[s] || cls.draft}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-6 page-enter">
      
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-[17px] font-black text-gray-900 tracking-tight uppercase">Timesheets Hub</h2>
            <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
              Accountability & Project Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(getMondayOf(new Date()))} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-all">Today</button>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl px-1 py-1">
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d.toISOString().slice(0,10)); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronLeft size={16}/></button>
            <span className="px-3 text-[12px] font-bold text-gray-700 min-w-[160px] text-center">{fmtWeekRange(weekStart, dates[6])}</span>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d.toISOString().slice(0,10)); }} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Logged Hours', val: loggedHours.toFixed(1), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', sub: '/ 40.0 expected' },
          { label: 'Weekly Progress', val: progressPct.toFixed(0)+'%', icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Completion state' },
          { label: 'Billable Target', val: '100%', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Standard allocation' },
          { label: 'Sync Health', val: 'Active', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Live attendance sync' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}><s.icon size={15} className={s.color} /></div>
            </div>
            <p className={`text-[24px] font-black ${s.color} tracking-tight leading-none`}>{s.val}</p>
            <p className="text-[11px] text-gray-400 font-bold mt-2 uppercase tracking-tight">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        <button onClick={() => setActiveTab('my')} className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${activeTab === 'my' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>My Timesheet</button>
        <button onClick={() => setActiveTab('history')} className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${activeTab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>History</button>
        {isManager && <button onClick={() => setActiveTab('approvals')} className={`px-5 py-3 text-[13px] font-bold border-b-2 transition-all ${activeTab === 'approvals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>Team Approvals</button>}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="space-y-6">
        {activeTab === 'my' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[14px] font-bold text-gray-800">Weekly Entry</h3>
                  {sheet && <StatusBadge s={sheet.status} />}
                </div>
                <div className="flex items-center gap-2">
                  {!isLocked && (
                    <button onClick={autoFill} disabled={autoFilling} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-blue-100 disabled:opacity-50">
                      <Zap size={13} /> {autoFilling ? 'Syncing...' : 'Sync Attendance'}
                    </button>
                  )}
                  {!isLocked && (
                    <button onClick={() => save(false)} disabled={saving} className="px-4 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-gray-100 disabled:opacity-50">
                      Save Draft
                    </button>
                  )}
                  {!isLocked && (
                    <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-5 py-1.5 bg-blue-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-100 disabled:opacity-50">
                      <Send size={13} /> Submit
                    </button>
                  )}
                </div>
              </div>

              {feedback && (
                <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2 text-[12px] font-bold ${feedback.type === 'ok' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  {feedback.type === 'ok' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {feedback.msg}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1000px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10.5px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="px-6 py-4 w-64">Project & Task</th>
                      {DAYS.map((d, i) => <th key={d} className="px-2 py-4 text-center w-24">{DAY_LABELS[i]}</th>)}
                      <th className="px-4 py-4 text-center w-24">Sum</th>
                      {!isLocked && <th className="px-4 py-4 w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-blue-50/30 transition-all">
                        <td className="px-6 py-4 space-y-2">
                          <input type="text" value={row.project_name} onChange={e => updateRow(idx, 'project_name', e.target.value)} disabled={isLocked} placeholder="Project Name" className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[13px] font-bold text-gray-800 focus:bg-white focus:border-blue-400 outline-none disabled:opacity-60" />
                          <input type="text" value={row.task_desc} onChange={e => updateRow(idx, 'task_desc', e.target.value)} disabled={isLocked} placeholder="Task Overview" className="w-full bg-transparent border-none text-[11px] font-medium text-gray-400 outline-none px-3" />
                        </td>
                        {DAYS.map(d => (
                          <td key={d} className="px-1 py-4">
                            <input type="number" step="0.5" min="0" max="24" value={row[`${d}_hours`]} onChange={e => updateRow(idx, `${d}_hours`, e.target.value)} disabled={isLocked} className={`w-full text-center py-2 rounded-xl text-[14px] font-black outline-none border transition-all ${parseFloat(row[`${d}_hours`]) > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-100'}`} />
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center">
                          <span className="text-[15px] font-black text-gray-900">{DAYS.reduce((s,d)=>s+(parseFloat(row[`${d}_hours`])||0),0).toFixed(1)}</span>
                        </td>
                        {!isLocked && (
                          <td className="px-4 py-4">
                            <button onClick={() => removeRow(idx)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50/50 border-t border-gray-100">
                    <tr>
                      <td className="px-6 py-4">
                        {!isLocked && <button onClick={addRow} className="flex items-center gap-2 text-[12px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"><Plus size={14}/> Add Line</button>}
                      </td>
                      {dayTotals.map((t, i) => <td key={i} className="px-2 py-4 text-center text-[12px] font-black text-gray-600">{t > 0 ? t.toFixed(1) : '—'}</td>)}
                      <td className="px-4 py-4 text-center"><span className="text-[16px] font-black text-blue-600">{loggedHours.toFixed(1)}</span></td>
                      {!isLocked && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 space-y-2 w-full">
                <div className="flex justify-between items-center">
                  <p className="text-[12px] font-black text-gray-500 uppercase tracking-widest">Weekly Capacity Utilization</p>
                  <p className="text-[13px] font-black text-gray-900">{progressPct.toFixed(0)}% <span className="text-gray-400 font-bold ml-1">({loggedHours.toFixed(1)} / 40h)</span></p>
                </div>
                <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5">
                  <div className={`h-full rounded-full transition-all duration-700 ${progressPct >= 100 ? 'bg-emerald-500' : progressPct > 80 ? 'bg-blue-500' : 'bg-indigo-400'}`} style={{ width: `${progressPct}%` }}></div>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
                <Info size={20} className="text-blue-500" />
                <p className="text-[11.5px] text-gray-500 font-medium leading-relaxed">System requires 40.0 hours weekly log for full payroll processing in the next cycle.</p>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs handled with Coming Soon style if not detailed yet */}
        {activeTab !== 'my' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-20 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 animate-pulse"><FileText size={32} /></div>
            <div>
              <h3 className="text-[16px] font-black text-gray-900 uppercase tracking-tight">{activeTab === 'history' ? 'Archive Vault' : 'Team Oversight'} Under Population</h3>
              <p className="text-[13px] text-gray-400 mt-2 max-w-xs mx-auto">This analytic view is currently integrating with the core backend services to provide live database reports.</p>
            </div>
            <button onClick={()=>setActiveTab('my')} className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all">Back to Live View</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timesheets;
