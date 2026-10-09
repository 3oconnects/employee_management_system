import { DAYS, EntryRow } from './types';

export function toLocalDateStr(d: Date): string {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(str: string): Date {
  if (!str) return new Date();
  const clean = str.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

export function getMondayOf(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

export function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = parseLocalDate(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDayHeaderDate(iso: string): string {
  if (!iso) return '';
  const d = parseLocalDate(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export function fmtWeekRange(start: string, end: string): string {
  if (!start || !end) return '—';
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  return `${fmtDate(start)} – ${fmtDate(end)}, ${e.getFullYear()}`;
}

export function weekDates(weekStart: string): string[] {
  return DAYS.map((_, i) => {
    const d = parseLocalDate(weekStart);
    d.setDate(d.getDate() + i);
    return toLocalDateStr(d);
  });
}

export const blankRow = (): EntryRow => ({
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
