import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { 
  TabKey, EntryRow, Timesheet, HistoryItem, PendingItem, DAYS, EXPECTED_HRS 
} from '../types';
import { 
  getMondayOf, toLocalDateStr, weekDates, blankRow 
} from '../utils';

import { TimesheetHeader } from '../components/TimesheetHeader';
import { TimesheetKPIs } from '../components/TimesheetKPIs';
import { TimesheetTabs } from '../components/TimesheetTabs';
import { WeeklyTimesheetGrid } from '../components/WeeklyTimesheetGrid';
import { TimesheetHistoryTab } from '../components/TimesheetHistoryTab';
import { TimesheetApprovalsTab } from '../components/TimesheetApprovalsTab';
import { TimesheetRejectionModal } from '../components/TimesheetRejectionModal';

const Timesheets: React.FC = () => {
  const { user, hasPermission } = useAuthStore();
  const userId = user?.id;
  const isManager = hasPermission('timesheet.approve') || hasPermission('timesheet:approve');

  // ── Navigation & Period State ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));

  // ── Weekly Timesheet State ──────────────────────────────────────────────────
  const [sheet,       setSheet]       = useState<Timesheet | null>(null);
  const [rows,        setRows]        = useState<EntryRow[]>([blankRow()]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [feedback,    setFeedback]    = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // ── History State ───────────────────────────────────────────────────────────
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [histFilter,  setHistFilter]  = useState<string>('all');
  const [histLoading, setHistLoading] = useState(false);

  // ── Approvals State (Manager View) ─────────────────────────────────────────
  const [pending,         setPending]         = useState<PendingItem[]>([]);
  const [appLoading,      setAppLoading]      = useState(false);
  const [appSearch,       setAppSearch]       = useState('');
  const [appFilter,       setAppFilter]       = useState<'all' | 'full' | 'partial'>('all');
  const [rejectModalItem, setRejectModalItem] = useState<PendingItem | null>(null);
  const [rejectRemarks,   setRejectRemarks]   = useState('');
  const [rejectLoading,   setRejectLoading]   = useState(false);

  // ── Computed Statistics ─────────────────────────────────────────────────────
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

  const totalPendingHours = useMemo(() => 
    pending.reduce((sum, p) => sum + (parseFloat(p.total_hours) || 0), 0),
    [pending]
  );

  const filteredPending = useMemo(() => {
    return pending.filter(p => {
      const q = appSearch.toLowerCase().trim();
      const nameMatch = !q || 
        (p.applicant_name || '').toLowerCase().includes(q) ||
        (p.applicant_email || '').toLowerCase().includes(q);
      if (!nameMatch) return false;
      const hrs = parseFloat(p.total_hours) || 0;
      if (appFilter === 'full') return hrs >= 40;
      if (appFilter === 'partial') return hrs < 40;
      return true;
    });
  }, [pending, appSearch, appFilter]);

  // ── Data Loaders ───────────────────────────────────────────────────────────
  const loadWeek = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const { data } = await api.get('/timesheets/week', { params: { userId, weekStart } });
      setSheet(data);
      if (data.entries?.length > 0) {
        setRows(data.entries.map((e: any) => ({
          id: e.id,
          project_name: e.project_name || '',
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

  const loadPending = useCallback(async () => {
    setAppLoading(true);
    try {
      const { data } = await api.get('/timesheets/pending');
      setPending(data.items || []);
    } catch {
      /* ignore */
    } finally {
      setAppLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data } = await api.get('/timesheets/history', { params: { userId } });
      setHistory(data.items || []);
    } catch {
      /* ignore */
    } finally {
      setHistLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadWeek(); }, [loadWeek]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
    if (activeTab === 'approvals') {
      loadPending();
    }
  }, [activeTab, loadHistory, loadPending]);

  // ── Actions & Methods ───────────────────────────────────────────────────────
  const autoFill = async () => {
    if (!sheet || isLocked) return;
    setAutoFilling(true);
    try {
      const { data } = await api.get('/attendance/weekly-hours', { 
        params: { userId, weekStart, weekEnd: dates[6] } 
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
          project_name: 'Core Engineering / Operations',
          task_desc: 'Standard assigned project deliverables',
          mon_hours: '8', tue_hours: '8', wed_hours: '8', thu_hours: '8', fri_hours: '8',
          sat_hours: '0', sun_hours: '0'
        };
      } else {
        updated.unshift({
          project_name: 'Core Engineering / Operations',
          task_desc: 'Standard assigned project deliverables',
          mon_hours: '8', tue_hours: '8', wed_hours: '8', thu_hours: '8', fri_hours: '8',
          sat_hours: '0', sun_hours: '0'
        });
      }
      return updated;
    });
    setFeedback({ type: 'ok', msg: 'Applied 40.0 hr standard weekly preset.' });
  };

  const save = async (submitAfter = false) => {
    if (!sheet || isLocked) return;
    setSaving(true);
    setFeedback(null);
    try {
      const entries = rows
        .filter(r => r.project_name.trim() || DAYS.some(d => parseFloat(r[`${d}_hours`]) > 0))
        .map(r => ({
          project_name: r.project_name,
          task_desc:    r.task_desc,
          mon_hours:    parseFloat(r.mon_hours) || 0,
          tue_hours:    parseFloat(r.tue_hours) || 0,
          wed_hours:    parseFloat(r.wed_hours) || 0,
          thu_hours:    parseFloat(r.thu_hours) || 0,
          fri_hours:    parseFloat(r.fri_hours) || 0,
          sat_hours:    parseFloat(r.sat_hours) || 0,
          sun_hours:    parseFloat(r.sun_hours) || 0,
        }));

      await api.put(`/timesheets/${sheet.id}`, { entries });

      if (submitAfter) {
        await api.post(`/timesheets/${sheet.id}/submit`);
        setSheet(prev => prev ? { ...prev, status: 'submitted' } : null);
        setFeedback({ type: 'ok', msg: 'Timesheet successfully submitted for manager approval.' });
      } else {
        setFeedback({ type: 'ok', msg: 'Draft progress saved successfully.' });
      }
      loadWeek();
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err?.response?.data?.error || 'Failed to save timesheet.' });
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (idx: number, field: string, val: string) => {
    if (isLocked) return;
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const addRow = () => setRows(p => [...p, blankRow()]);
  const removeRow = (idx: number) => { 
    if (rows.length > 1) {
      setRows(p => p.filter((_, i) => i !== idx)); 
    }
  };

  // ── Manager Approval Handlers ──────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    try {
      await api.put(`/timesheets/${id}/approve`, { action: 'approved', approved_by: userId });
      setPending(prev => prev.filter(x => x.id !== id));
      setFeedback({ type: 'ok', msg: 'Timesheet successfully approved.' });
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err?.response?.data?.error || 'Failed to approve timesheet.' });
    }
  };

  const handleOpenRejectModal = (item: PendingItem) => {
    setRejectModalItem(item);
    setRejectRemarks('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setRejectLoading(true);
    try {
      await api.put(`/timesheets/${rejectModalItem.id}/approve`, {
        action: 'rejected',
        approved_by: userId,
        remarks: rejectRemarks.trim() || undefined,
      });
      setPending(prev => prev.filter(x => x.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectRemarks('');
      setFeedback({ type: 'ok', msg: 'Timesheet returned to draft with manager remarks.' });
    } catch (err: any) {
      setFeedback({ type: 'err', msg: err?.response?.data?.error || 'Failed to reject timesheet.' });
    } finally {
      setRejectLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-7 max-w-[1600px] mx-auto page-enter">
      {/* ── Submodule 1: Page Header & Week Navigator ────────────────────── */}
      <TimesheetHeader
        activeTab={activeTab}
        sheet={sheet}
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        dates={dates}
        currentWeekMonday={currentWeekMonday}
        isCurrentWeek={isCurrentWeek}
        isManager={isManager}
        pendingCount={pending.length}
      />

      {/* ── Submodule 2: Telemetry KPI Cards ──────────────────────────────── */}
      <TimesheetKPIs
        activeTab={activeTab}
        isManager={isManager}
        loggedHours={loggedHours}
        progressPct={progressPct}
        sheet={sheet}
        pendingCount={pending.length}
        totalPendingHours={totalPendingHours}
      />

      {/* ── Submodule 3: Navigation Tabs ──────────────────────────────────── */}
      <TimesheetTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isManager={isManager}
        historyCount={history.length}
        pendingCount={pending.length}
      />

      {/* ── Submodule 4: Active View Body ─────────────────────────────────── */}
      {activeTab === 'my' && (
        <WeeklyTimesheetGrid
          sheet={sheet}
          rows={rows}
          isLocked={isLocked}
          saving={saving}
          autoFilling={autoFilling}
          loggedHours={loggedHours}
          progressPct={progressPct}
          dayTotals={dayTotals}
          dates={dates}
          today={today}
          feedback={feedback}
          setFeedback={setFeedback}
          fillStandardPreset={fillStandardPreset}
          autoFill={autoFill}
          save={save}
          updateRow={updateRow}
          addRow={addRow}
          removeRow={removeRow}
        />
      )}

      {activeTab === 'history' && (
        <TimesheetHistoryTab
          history={history}
          histLoading={histLoading}
          histFilter={histFilter}
          setHistFilter={setHistFilter}
          onSelectWeek={(selectedWeekStart) => {
            setWeekStart(selectedWeekStart);
            setActiveTab('my');
          }}
        />
      )}

      {activeTab === 'approvals' && isManager && (
        <TimesheetApprovalsTab
          pending={pending}
          filteredPending={filteredPending}
          appLoading={appLoading}
          appSearch={appSearch}
          setAppSearch={setAppSearch}
          appFilter={appFilter}
          setAppFilter={setAppFilter}
          totalPendingHours={totalPendingHours}
          onRefresh={loadPending}
          onSwitchToMy={() => setActiveTab('my')}
          onApprove={handleApprove}
          onOpenReject={handleOpenRejectModal}
        />
      )}

      {/* ── Submodule 5: Rejection Modal Portal ───────────────────────────── */}
      <TimesheetRejectionModal
        item={rejectModalItem}
        remarks={rejectRemarks}
        setRemarks={setRejectRemarks}
        loading={rejectLoading}
        onClose={() => setRejectModalItem(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
};

export default Timesheets;
