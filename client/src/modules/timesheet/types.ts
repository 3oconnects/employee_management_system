// ── Timesheet Module Types & Constants ─────────────────────────────────────

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const EXPECTED_HRS = 40;

export type DayKey = typeof DAYS[number];

export interface EntryRow {
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

export interface Timesheet {
  id: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  week_start: string;
  week_end: string;
  total_hours: string;
  remarks?: string;
  entries: EntryRow[];
}

export interface HistoryItem {
  id: string;
  week_start: string;
  week_end: string;
  status: string;
  total_hours: string;
  remarks?: string;
}

export interface PendingItem {
  id: string;
  week_start: string;
  week_end: string;
  total_hours: string;
  applicant_email: string;
  applicant_name?: string;
  entries?: EntryRow[];
}

export type TabKey = 'my' | 'history' | 'approvals';
