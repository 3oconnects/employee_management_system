import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, ChevronLeft, ChevronRight, Plus, Trash2,
  CheckCircle2, AlertTriangle, Send, History, 
  Users, RefreshCw, Info, Zap, CalendarDays, 
  Target, BarChart2, XCircle, FileText,
  Search, Filter, Download, ArrowUpRight, ArrowDownRight,
  Database,
  Layers, Loader2
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
    } catch { setFeedback({ type: 'err', msg: 'Failed to synchronize timesheet matrix.' }); }
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
      attRow.project_name = 'Protocol Verification (Attendance)';
      attRow.task_desc    = 'Synchronized from biometric check-in/out telemetry';
      dates.forEach((d, i) => { if (dayMap[d]) attRow[`${DAYS[i]}_hours`] = dayMap[d].toFixed(2); });
      setRows(prev => [attRow, ...prev.filter(r => r.project_name !== 'Protocol Verification (Attendance)')]);
      setFeedback({ type: 'ok', msg: 'Matrix auto-filled from attendance telemetry.' });
    } catch { setFeedback({ type: 'err', msg: 'Synchronization pipeline failed.' }); } finally { setAutoFilling(false); }
  };

  const save = async (isSubmit = false) => {
    if (!sheet) return;
    const payload = rows.filter(r => r.project_name.trim()).map(r => ({
      project_name: r.project_name, task_desc: r.task_desc,
      mon_hours: parseFloat(r.mon_hours) || 0, tue_hours: parseFloat(r.tue_hours) || 0, wed_hours: parseFloat(r.wed_hours) || 0,
      thu_hours: parseFloat(r.thu_hours) || 0, fri_hours: parseFloat(r.fri_hours) || 0, sat_hours: parseFloat(r.sat_hours) || 0, sun_hours: parseFloat(r.sun_hours) || 0,
    }));
    if (isSubmit && payload.length === 0) return setFeedback({ type: 'err', msg: 'Entries required for protocol submission.' });
    setSaving(true);
    try {
      await api.put(`/timesheets/${sheet.id}/entries`, { entries: payload });
      if (isSubmit) await api.put(`/timesheets/${sheet.id}/submit`);
      setFeedback({ type: 'ok', msg: isSubmit ? 'Protocol submitted for executive approval.' : 'Draft matrix saved.' });
      loadWeek();
    } catch { setFeedback({ type: 'err', msg: 'Commit failed. Protocol integrity compromised.' }); } finally { setSaving(false); }
  };

  const updateRow = (idx: number, field: keyof EntryRow, val: string) => setRows(p => p.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow = () => setRows(p => [...p, blankRow()]);
  const removeRow = (idx: number) => { if (rows.length > 1) setRows(p => p.filter((_, i) => i !== idx)); };

  const StatusBadge = ({ s }: { s: string }) => {
    const cls: any = { 
      draft:     'bg-slate-50 text-slate-500 border-slate-200', 
      submitted: 'bg-amber-50 text-amber-600 border-amber-200', 
      approved:  'bg-emerald-50 text-emerald-600 border-emerald-200', 
      rejected:  'bg-rose-50 text-rose-600 border-rose-200' 
    };
    return <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${cls[s] || cls.draft}`}>{s}</span>;
  };

  return (
    <div className="p-6 space-y-8 page-enter max-w-[1600px] mx-auto">
      
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Clock size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0F172A] tracking-tight">Temporal Matrix</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
              Strategic Unit Tracking & Accountability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setWeekStart(getMondayOf(new Date()))} 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-white transition-all shadow-sm"
          >
            Current Cycle
          </button>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d.toISOString().slice(0,10)); }} className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft size={16}/></button>
            <span className="px-4 text-[11px] font-black text-slate-700 uppercase tracking-widest min-w-[180px] text-center">{fmtWeekRange(weekStart, dates[6])}</span>
            <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d.toISOString().slice(0,10)); }} className="p-1.5 hover:bg-white rounded-md text-slate-400 hover:text-indigo-600 transition-all"><ChevronRight size={16}/></button>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Logged Hours', val: loggedHours.toFixed(1), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: '/ 40.0 Goal' },
          { label: 'Capacity', val: progressPct.toFixed(0)+'%', icon: BarChart2, color: 'text-slate-600', bg: 'bg-slate-100', sub: 'Matrix Completion' },
          { label: 'Operational Target', val: '100%', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: 'Standard Allocation' },
          { label: 'Telemetry', val: 'Active', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Live Sync' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}><s.icon size={14} className={s.color} /></div>
            </div>
            <p className={`text-2xl font-black ${s.color} tracking-tight leading-none`}>{s.val}</p>
            <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-50/50 border border-slate-100 rounded-xl w-fit">
        {[
          { id: 'my', label: 'Matrix Entry', icon: Layers },
          { id: 'history', label: 'Archive', icon: History },
          ...(isManager ? [{ id: 'approvals', label: 'Unit Approvals', icon: Users }] : [])
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} 
            className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              activeTab === t.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-700 hover:bg-white'
            }`}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────── */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'my' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[13px] font-black text-[#0F172A] uppercase tracking-wider">Weekly Matrix Submission</h3>
                  {sheet && <StatusBadge s={sheet.status} />}
                </div>
                <div className="flex items-center gap-2">
                  {!isLocked && (
                    <button onClick={autoFill} disabled={autoFilling} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50">
                      <Zap size={12} /> {autoFilling ? 'Syncing...' : 'Sync Telemetry'}
                    </button>
                  )}
                  {!isLocked && (
                    <button onClick={() => save(false)} disabled={saving} className="px-4 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                      Save Draft
                    </button>
                  )}
                  {!isLocked && (
                    <button onClick={() => save(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                      <Send size={12} /> Commit Matrix
                    </button>
                  )}
                </div>
              </div>

              {feedback && (
                <div className={`mx-6 mt-4 p-3 rounded-xl border border-dashed flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wide ${feedback.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {feedback.type === 'ok' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {feedback.msg}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4 w-72">Operational Project & Tasking</th>
                      {DAYS.map((d, i) => <th key={d} className="px-2 py-4 text-center w-20">{DAY_LABELS[i]}</th>)}
                      <th className="px-4 py-4 text-center w-24">Aggregated</th>
                      {!isLocked && <th className="px-4 py-4 w-12 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <input type="text" value={row.project_name} onChange={e => updateRow(idx, 'project_name', e.target.value)} disabled={isLocked} placeholder="PROJECT IDENTIFIER" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] font-bold text-slate-700 placeholder:text-slate-300 focus:border-indigo-500 outline-none transition-all disabled:opacity-60" />
                          <input type="text" value={row.task_desc} onChange={e => updateRow(idx, 'task_desc', e.target.value)} disabled={isLocked} placeholder="Task details..." className="w-full bg-transparent border-none text-[10px] font-bold text-slate-400 outline-none px-3 mt-1.5 italic" />
                        </td>
                        {DAYS.map(d => (
                          <td key={d} className="px-2 py-4">
                            <input type="number" step="0.5" min="0" max="24" value={row[`${d}_hours`]} onChange={e => updateRow(idx, `${d}_hours`, e.target.value)} disabled={isLocked} className={`w-full text-center py-2 rounded-lg text-[13px] font-black outline-none border transition-all ${parseFloat(row[`${d}_hours`]) > 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200 focus:bg-white focus:text-slate-700'}`} />
                          </td>
                        ))}
                        <td className="px-4 py-4 text-center">
                          <span className="text-[16px] font-black text-slate-700 tracking-tight">{DAYS.reduce((s,d)=>s+(parseFloat(row[`${d}_hours`])||0),0).toFixed(1)}</span>
                        </td>
                        {!isLocked && (
                          <td className="px-4 py-4 text-center">
                            <button onClick={() => removeRow(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50/50">
                    <tr className="text-[11px] font-black text-slate-500">
                      <td className="px-6 py-4">
                        {!isLocked && <button onClick={addRow} className="flex items-center gap-2 text-[10px] text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors"><Plus size={14} className="bg-white p-0.5 rounded-md border border-indigo-100 shadow-sm"/> Add Operational Line</button>}
                      </td>
                      {dayTotals.map((t, i) => <td key={i} className="px-2 py-4 text-center opacity-60 font-bold">{t > 0 ? t.toFixed(1) : '—'}</td>)}
                      <td className="px-4 py-4 text-center bg-indigo-600 text-white"><span className="text-[15px] font-black tracking-tight">{loggedHours.toFixed(1)}</span></td>
                      {!isLocked && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <div className="flex-1 space-y-3 w-full">
                <div className="flex justify-between items-center px-1">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Matrix Capacity Utilization</p>
                  <p className="text-[13px] font-black text-slate-700 tracking-tight">{progressPct.toFixed(0)}% <span className="text-slate-400 font-bold ml-2">({loggedHours.toFixed(1)} / 40h)</span></p>
                </div>
                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${progressPct >= 100 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : progressPct > 80 ? 'bg-indigo-400' : 'bg-indigo-600'}`} style={{ width: `${progressPct}%` }}></div>
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-4 bg-slate-50/50 rounded-xl border border-slate-100 max-w-md">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"><Info size={16} className="text-indigo-600" /></div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-tight">System protocol requires 40.0 temporal units weekly for full payroll authorization.</p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <h3 className="text-[13px] font-black text-[#0F172A] uppercase tracking-wider">Temporal Matrix Archive</h3>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[9px] font-black text-slate-400 uppercase tracking-widest">{history.length} PROTOCOLS</span>
              </div>
              <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                {['all', 'draft', 'submitted', 'approved', 'rejected'].map(f => (
                  <button key={f} onClick={() => setHistFilter(f)}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${histFilter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {histLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Querying Temporal Archives...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30">
                <Database size={40} className="text-slate-200" />
                <div className="text-center">
                  <p className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Archive Void</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Commit your first matrix to initialize history.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">Temporal Cycle</th>
                      <th className="px-6 py-4">Aggregated Units</th>
                      <th className="px-6 py-4">Protocol Status</th>
                      <th className="px-6 py-4">Executive Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {history.filter(h => histFilter === 'all' || h.status === histFilter).map(h => (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{fmtWeekRange(h.week_start, h.week_end)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[14px] font-black text-indigo-600 tracking-tight">{parseFloat(h.total_hours || '0').toFixed(1)}h</p>
                        </td>
                        <td className="px-6 py-4"><StatusBadge s={h.status} /></td>
                        <td className="px-6 py-4">
                          <p className="text-[11px] text-slate-400 font-bold italic truncate max-w-xs">{h.remarks || 'No remarks recorded.'}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Approvals Tab */}
        {activeTab === 'approvals' && isManager && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-[13px] font-black text-[#0F172A] uppercase tracking-wider">Pending Authorizations</h3>
                {pending.length > 0 && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-[9px] font-black uppercase tracking-widest">{pending.length} ACTION REQUIRED</span>
                )}
              </div>
            </div>
            {appLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 size={24} className="text-indigo-600 animate-spin" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Retrieving Submissions...</span>
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-black text-slate-900 uppercase tracking-widest">Protocol Clear</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">All unit timesheets have been processed.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">Operational Unit</th>
                      <th className="px-6 py-4">Temporal Cycle</th>
                      <th className="px-6 py-4">Units</th>
                      <th className="px-6 py-4 text-right">Protocol Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pending.map((p: any) => (
                      <TimesheetApprovalRow
                        key={p.id}
                        p={p}
                        userId={userId}
                        fmtWeekRange={fmtWeekRange}
                        StatusBadge={StatusBadge}
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

// Extracted row component to use hooks properly
const TimesheetApprovalRow = ({ p, userId, fmtWeekRange, StatusBadge, onDone }: any) => {
  const [actionState, setActionState] = useState<'idle'|'loading'>('idle');
  const doAction = async (action: 'approved' | 'rejected') => {
    setActionState('loading');
    try {
      await api.put(`/timesheets/${p.id}/approve`, { action, approved_by: userId });
      onDone();
    } catch { /* ignore */ } finally { setActionState('idle'); }
  };
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-5">
        <p className="text-[13px] font-black text-[#0F172A] tracking-tight">{p.applicant_name || p.applicant_email}</p>
        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">{p.applicant_email}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{fmtWeekRange(p.week_start, p.week_end)}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-[15px] font-black text-indigo-600 tracking-tight">{parseFloat(p.total_hours || '0').toFixed(1)}h</p>
      </td>
      <td className="px-6 py-5 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => doAction('approved')}
            disabled={actionState === 'loading'}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <CheckCircle2 size={12} /> Authorize
          </button>
          <button
            onClick={() => doAction('rejected')}
            disabled={actionState === 'loading'}
            className="px-4 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            Deny
          </button>
        </div>
      </td>
    </tr>
  );
};

export default Timesheets;


