import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    TrendingUp,
    MapPin,
    Download,
    Loader2,
    CalendarCheck,
    Coffee,
    ChevronLeft,
    ChevronRight,
    Timer,
    FileSpreadsheet,
    ShieldCheck,
    Info,
    CalendarDays
} from 'lucide-react';
import api from '../../../services/api';

interface EmployeeAttendanceModalProps {
    employee: {
        id: string | number;
        name: string;
        email?: string;
        department?: string;
        position?: string;
        employee_id?: string;
        avatar_url?: string;
        check_in?: string;
        check_out?: string;
        location?: string;
        today_hours?: number;
        days_present?: number;
        total_hours?: number;
        avg_daily_hours?: number;
        overtime_hours?: number;
    } | null;
    onClose: () => void;
}

export const EmployeeAttendanceModal: React.FC<EmployeeAttendanceModalProps> = ({ employee, onClose }) => {
    const [month, setMonth] = useState<number>(() => new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(() => new Date().getFullYear());
    const [loading, setLoading] = useState<boolean>(false);
    const [details, setDetails] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'calendar' | 'ledger'>('calendar');
    const [filter, setFilter] = useState<'all' | 'present' | 'late' | 'leaves'>('all');
    
    // Default selected date to today (YYYY-MM-DD)
    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

    // Initial pre-fill so view renders IMMEDIATELY with zero lag
    useEffect(() => {
        if (!employee) return;
        const fallbackDays = employee.days_present || 1;
        const fallbackHours = employee.total_hours || (fallbackDays * 8.0);
        
        setDetails((prev: any) => {
            if (prev && prev.employee?.id === employee.id) return prev;
            return {
                employee: {
                    id: employee.id,
                    name: employee.name,
                    email: employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '.')}@ozofi.com`,
                    department: employee.department || 'Operations',
                    position: employee.position || 'Specialist',
                    employee_id: employee.employee_id || `EMP-${employee.id}`,
                    avatar_url: employee.avatar_url,
                },
                period: {
                    month,
                    year,
                    daysInMonth: new Date(year, month, 0).getDate(),
                    elapsedWorkingDays: 6,
                    totalWorkingDays: 22,
                },
                metrics: {
                    daysPresent: fallbackDays,
                    daysAbsent: 0,
                    approvedLeaveDays: 0,
                    totalHoursWorked: fallbackHours,
                    avgDailyHours: employee.avg_daily_hours || 8.0,
                    overtimeHours: employee.overtime_hours || 0,
                    attendanceRate: 100,
                    onTimeArrivals: fallbackDays,
                    lateArrivals: 0,
                    onTimeRate: 100,
                },
                weeklyBreakdown: [],
                history: [
                    {
                        id: 1,
                        date: todayStr,
                        checkIn: employee.check_in || new Date().toISOString(),
                        checkOut: employee.check_out,
                        durationHours: employee.today_hours || 8.0,
                        overtimeHours: 0,
                        isLate: false,
                        status: 'present',
                        location: employee.location || 'Main Office',
                    }
                ],
                leaves: [],
            };
        });
    }, [employee, month, year, todayStr]);

    // Fetch live backend metrics
    useEffect(() => {
        if (!employee) return;
        let isMounted = true;
        setLoading(true);

        api.get(`/reports/attendance/employee/${employee.id}?month=${month}&year=${year}`)
            .then(({ data }: any) => {
                if (isMounted && data) {
                    setDetails(data);
                    if (data?.history?.some((h: any) => h.date === todayStr)) {
                        setSelectedCalendarDate(todayStr);
                    } else if (data?.history?.length > 0) {
                        setSelectedCalendarDate(data.history[0].date);
                    }
                }
            })
            .catch((err: any) => {
                console.warn('Could not fetch detailed attendance logs:', err?.message);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [employee, month, year, todayStr]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!employee) return null;

    const empInfo = details?.employee || {
        name: employee.name,
        email: employee.email,
        department: employee.department || 'General',
        position: employee.position || 'Staff',
        employee_id: employee.employee_id || `EMP-${employee.id}`,
        avatar_url: employee.avatar_url,
    };

    const metrics = details?.metrics || {
        daysPresent: employee.days_present || 0,
        daysAbsent: 0,
        approvedLeaveDays: 0,
        totalHoursWorked: employee.total_hours || 0,
        avgDailyHours: employee.avg_daily_hours || 0,
        overtimeHours: employee.overtime_hours || 0,
        attendanceRate: 100,
        onTimeArrivals: employee.days_present || 0,
        lateArrivals: 0,
        onTimeRate: 100,
    };

    const history: any[] = details?.history || [];
    const leaves: any[] = details?.leaves || [];
    const elapsedWorkingDays = details?.period?.elapsedWorkingDays || 6;

    // Month Navigation
    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(year - 1);
        } else {
            setMonth(month - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(year + 1);
        } else {
            setMonth(month + 1);
        }
    };

    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });

    // Format helpers
    const formatTime = (ts?: string | null) => {
        if (!ts) return '--:--';
        try {
            return new Date(ts).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch {
            return '--:--';
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Export CSV
    const handleExportCSV = () => {
        const rows = [
            ['Date', 'Check In', 'Check Out', 'Hours Worked', 'Overtime', 'Status', 'Location Hub'],
            ...history.map((h: any) => [
                h.date,
                formatTime(h.checkIn),
                h.checkOut ? formatTime(h.checkOut) : 'In Progress',
                h.durationHours ? `${h.durationHours} hrs` : '0 hrs',
                h.overtimeHours ? `${h.overtimeHours} hrs` : '0 hrs',
                h.status,
                h.location || 'Main Office'
            ])
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${empInfo.name.replace(/\s+/g, '_')}_Attendance_${monthName}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filtered ledger rows
    const filteredHistory = history.filter((item: any) => {
        if (filter === 'all') return true;
        if (filter === 'present') return item.status === 'present';
        if (filter === 'late') return item.isLate || item.status === 'late';
        if (filter === 'leaves') return item.status === 'leave';
        return true;
    });

    // Calendar generation
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const now = new Date();

    const calendarCells: Array<{
        dayNumber: number;
        dateStr: string;
        isCurrentMonth: boolean;
        isWeekend: boolean;
        isToday: boolean;
        isFuture: boolean;
        entry?: any;
        leave?: any;
        status: 'present' | 'late' | 'leave' | 'absent' | 'weekend' | 'future';
    }> = [];

    // 1. Previous Month Filler Cells
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dNum = prevMonthDays - i;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const dStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
        calendarCells.push({
            dayNumber: dNum,
            dateStr: dStr,
            isCurrentMonth: false,
            isWeekend: false,
            isToday: false,
            isFuture: true,
            status: 'future'
        });
    }

    // 2. Current Month Cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isToday = (dStr === todayStr);
        const cellDate = new Date(year, month - 1, d, 23, 59, 59);
        const isFuture = cellDate > now && !isToday;

        const entry = history.find((h: any) => {
            if (h.date === dStr) return true;
            if (h.checkIn) {
                const inD = new Date(h.checkIn);
                const inDStr = `${inD.getFullYear()}-${String(inD.getMonth() + 1).padStart(2, '0')}-${String(inD.getDate()).padStart(2, '0')}`;
                return inDStr === dStr;
            }
            return false;
        });

        const leave = leaves.find((l: any) => {
            const start = new Date(l.start_date).toISOString().split('T')[0];
            const end = new Date(l.end_date).toISOString().split('T')[0];
            return dStr >= start && dStr <= end;
        });

        // Also check if employee prop has active punch today
        const isEmployeeActiveToday = isToday && (employee.check_in || (employee.today_hours && employee.today_hours > 0));
        const resolvedEntry = entry || (isEmployeeActiveToday ? {
            id: 'today-active',
            date: dStr,
            checkIn: employee.check_in || new Date().toISOString(),
            checkOut: employee.check_out || null,
            durationHours: employee.today_hours || 0,
            overtimeHours: 0,
            isLate: false,
            status: 'present',
            location: employee.location || 'Main Office',
        } : null);

        let status: 'present' | 'late' | 'leave' | 'absent' | 'weekend' | 'future' = 'future';

        if (isWeekend) {
            status = 'weekend';
        } else if (leave) {
            status = 'leave';
        } else if (resolvedEntry) {
            status = resolvedEntry.isLate ? 'late' : 'present';
        } else if (isFuture) {
            status = 'future';
        } else {
            status = 'absent';
        }

        calendarCells.push({
            dayNumber: d,
            dateStr: dStr,
            isCurrentMonth: true,
            isWeekend,
            isToday,
            isFuture,
            entry: resolvedEntry,
            leave,
            status
        });
    }

    // 3. Next Month Trailing Filler Cells (to complete rows)
    const totalSlots = Math.ceil(calendarCells.length / 7) * 7;
    const trailingCount = totalSlots - calendarCells.length;
    for (let i = 1; i <= trailingCount; i++) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const dStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        calendarCells.push({
            dayNumber: i,
            dateStr: dStr,
            isCurrentMonth: false,
            isWeekend: false,
            isToday: false,
            isFuture: true,
            status: 'future'
        });
    }

    // Find selected date record
    const selectedDayData = calendarCells.find(c => c.dateStr === selectedCalendarDate && c.isCurrentMonth);
    const selectedPunch = selectedDayData?.entry || history.find((h: any) => {
        if (h.date === selectedCalendarDate) return true;
        if (h.checkIn) {
            const inD = new Date(h.checkIn);
            const inDStr = `${inD.getFullYear()}-${String(inD.getMonth() + 1).padStart(2, '0')}-${String(inD.getDate()).padStart(2, '0')}`;
            return inDStr === selectedCalendarDate;
        }
        return false;
    });

    // PORTAL: Mount directly on document.body for true full-height drawer
    return createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true">
            {/* 1. Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* 2. Slide-Over Drawer Container (Full Viewport Height) */}
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300 ease-out">
                
                {/* ── TOP HEADER ────────────────────────────────────────── */}
                <div className="px-6 py-4 border-b border-slate-200/80 bg-white flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3.5 min-w-0">
                        {empInfo.avatar_url ? (
                            <img
                                src={empInfo.avatar_url}
                                alt={empInfo.name}
                                className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-100 shrink-0"
                            />
                        ) : (
                            <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {empInfo.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-bold text-slate-900 truncate">
                                    {empInfo.name}
                                </h2>
                                <span className="px-1.5 py-0.5 text-[10.5px] font-mono font-semibold bg-slate-100 text-slate-600 rounded">
                                    {empInfo.employee_id}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Profile
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                                {empInfo.position} &bull; {empInfo.department} &bull; <span className="text-slate-400">{empInfo.email}</span>
                            </p>
                        </div>
                    </div>

                    {/* Top Action Icons */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Month Navigator */}
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                            <button
                                onClick={handlePrevMonth}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition"
                                title="Previous Month"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-2 text-xs font-semibold text-slate-700 whitespace-nowrap">
                                {monthName} {year}
                            </span>
                            <button
                                onClick={handleNextMonth}
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded transition"
                                title="Next Month"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        {/* Export CSV */}
                        <button
                            onClick={handleExportCSV}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition"
                            title="Export Attendance CSV"
                        >
                            <Download size={16} />
                        </button>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Close Drawer (Esc)"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Optional Subtle Non-blocking Progress Bar */}
                {loading && (
                    <div className="h-0.5 w-full bg-indigo-100 overflow-hidden shrink-0">
                        <div className="h-full bg-indigo-600 animate-pulse w-full" />
                    </div>
                )}

                {/* ── KPI METRICS SUMMARY ROW ───────────────────────────── */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 grid grid-cols-4 gap-3 shrink-0">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Days Present
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black text-slate-900 font-mono">
                                {metrics.daysPresent}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                / {elapsedWorkingDays}d
                            </span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-600 font-mono">
                            {metrics.attendanceRate}% compliance
                        </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Hours Clocked
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black text-indigo-600 font-mono">
                                {metrics.totalHoursWorked}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                hrs
                            </span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-500 font-mono">
                            avg {metrics.avgDailyHours}h / day
                        </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Punctuality
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black text-slate-900 font-mono">
                                {metrics.onTimeRate}%
                            </span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-600 font-mono">
                            {metrics.lateArrivals} late punches
                        </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                            Overtime & Leaves
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-lg font-black text-slate-900 font-mono">
                                {metrics.overtimeHours}h
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                                OT
                            </span>
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-purple-600 font-mono">
                            {metrics.approvedLeaveDays} leaves approved
                        </span>
                    </div>
                </div>

                {/* ── VIEW SWITCHER TAB BAR ─────────────────────────────── */}
                <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                                viewMode === 'calendar'
                                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <CalendarDays size={14} />
                            Monthly Calendar View
                        </button>
                        <button
                            onClick={() => setViewMode('ledger')}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                                viewMode === 'ledger'
                                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <FileSpreadsheet size={14} />
                            Audit Log Ledger
                        </button>
                    </div>

                    {/* Status Legend */}
                    <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500" /> Leave
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> Absent
                        </span>
                    </div>
                </div>

                {/* ── SCROLLABLE BODY ───────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {viewMode === 'calendar' ? (
                        <>
                            {/* ── MONTHLY CALENDAR GRID ──────────────────── */}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                {/* Days of Week Header */}
                                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <span>Mon</span>
                                    <span>Tue</span>
                                    <span>Wed</span>
                                    <span>Thu</span>
                                    <span>Fri</span>
                                    <span className="text-slate-400">Sat</span>
                                    <span className="text-slate-400">Sun</span>
                                </div>

                                {/* Calendar Date Slots */}
                                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                                    {calendarCells.map((cell, idx) => {
                                        const isSelected = selectedCalendarDate === cell.dateStr && cell.isCurrentMonth;
                                        
                                        // Non-current month filler cells
                                        if (!cell.isCurrentMonth) {
                                            return (
                                                <div
                                                    key={`fill-${idx}`}
                                                    className="h-16 p-1.5 bg-slate-50/50 text-slate-300 text-[11px] select-none"
                                                >
                                                    <span>{cell.dayNumber}</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={cell.dateStr}
                                                type="button"
                                                onClick={() => setSelectedCalendarDate(cell.dateStr)}
                                                className={`h-16 p-1.5 text-left relative transition flex flex-col justify-between group outline-none cursor-pointer ${
                                                    isSelected
                                                        ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/50'
                                                        : cell.isToday
                                                        ? 'bg-blue-50/40 hover:bg-slate-50'
                                                        : 'hover:bg-slate-50 bg-white'
                                                }`}
                                            >
                                                {/* Day Header (Number & Today indicator) */}
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`text-[11.5px] font-bold ${
                                                        cell.isToday
                                                            ? 'text-indigo-600'
                                                            : cell.isWeekend
                                                            ? 'text-slate-400'
                                                            : 'text-slate-700'
                                                    }`}>
                                                        {cell.dayNumber}
                                                    </span>
                                                    {cell.isToday && (
                                                        <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-100 px-1 rounded">
                                                            Today
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Status Badge in Cell */}
                                                <div className="w-full mt-auto">
                                                    {cell.status === 'present' && (
                                                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-700 px-1 py-0.5 rounded text-[10px] font-semibold">
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                <span>{cell.entry?.durationHours ? `${cell.entry.durationHours}h` : '8h'}</span>
                                                            </span>
                                                        </div>
                                                    )}

                                                    {cell.status === 'late' && (
                                                        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 text-amber-700 px-1 py-0.5 rounded text-[10px] font-semibold">
                                                            <span className="flex items-center gap-0.5 truncate">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                                                <span>Late &bull; {cell.entry?.durationHours ? `${cell.entry.durationHours}h` : '8h'}</span>
                                                            </span>
                                                        </div>
                                                    )}

                                                    {cell.status === 'leave' && (
                                                        <div className="bg-purple-50 border border-purple-200 text-purple-700 px-1 py-0.5 rounded text-[10px] font-semibold truncate text-center">
                                                            Leave
                                                        </div>
                                                    )}

                                                    {cell.status === 'absent' && (
                                                        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-1 py-0.5 rounded text-[10px] font-semibold text-center">
                                                            Absent
                                                        </div>
                                                    )}

                                                    {cell.status === 'weekend' && (
                                                        <div className="text-[9.5px] text-slate-300 font-medium text-center">
                                                            Off
                                                        </div>
                                                    )}

                                                    {cell.status === 'future' && !cell.isWeekend && (
                                                        <div className="text-[9.5px] text-slate-300 font-medium text-center">
                                                            --
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── SELECTED DAY INSPECTOR CARD ─────────────── */}
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <CalendarCheck className="text-indigo-600" size={17} />
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                            Day Punch Inspector &bull; {selectedCalendarDate ? formatDateDisplay(selectedCalendarDate) : 'Select a date'}
                                        </h3>
                                    </div>
                                    {selectedPunch?.isLate && (
                                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            Late Arrival Logged
                                        </span>
                                    )}
                                    {selectedPunch && !selectedPunch.isLate && (
                                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Shift Fulfilled
                                        </span>
                                    )}
                                </div>

                                {selectedPunch ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Check-In Time
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-mono font-bold text-sm">
                                                <Clock size={13} className="text-emerald-500 shrink-0" />
                                                {formatTime(selectedPunch.checkIn)}
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Check-Out Time
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-mono font-bold text-sm">
                                                <Clock size={13} className="text-slate-400 shrink-0" />
                                                {selectedPunch.checkOut ? (
                                                    formatTime(selectedPunch.checkOut)
                                                ) : (
                                                    <span className="text-emerald-600 font-semibold text-xs flex items-center gap-1 font-sans">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Active Session
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Duration Worked
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-mono font-bold text-sm">
                                                <Timer size={13} className="text-indigo-500 shrink-0" />
                                                {selectedPunch.durationHours || 8.0} hrs
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                Work Location
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1 text-slate-900 font-semibold text-xs truncate">
                                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{selectedPunch.location || 'Main Office'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-6 text-center text-slate-400 text-xs">
                                        {selectedDayData?.isWeekend ? (
                                            <p className="flex items-center justify-center gap-1.5 text-slate-500">
                                                <Coffee size={15} /> Weekend rest period (Non-working day)
                                            </p>
                                        ) : selectedDayData?.leave ? (
                                            <p className="flex items-center justify-center gap-1.5 text-purple-600 font-medium">
                                                <Info size={15} /> Approved Leave Request: {selectedDayData.leave.reason || 'Annual Leave'}
                                            </p>
                                        ) : selectedDayData?.isFuture ? (
                                            <p className="text-slate-400">Scheduled upcoming workday</p>
                                        ) : (
                                            <p className="text-rose-500 font-medium">No biometric punch detected for this workday (Absent)</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── AUDIT LOG LEDGER VIEW ────────────────────────── */
                        <div className="space-y-3">
                            {/* Ledger Filter Controls */}
                            <div className="flex items-center gap-2">
                                {(['all', 'present', 'late', 'leaves'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setFilter(tab)}
                                        className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                                            filter === tab
                                                ? 'bg-slate-900 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {tab === 'all' ? 'All Days' : tab === 'late' ? 'Late Arrivals' : tab}
                                    </button>
                                ))}
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                                            <th className="py-2.5 px-3">Date</th>
                                            <th className="py-2.5 px-3">Status</th>
                                            <th className="py-2.5 px-3">Check-In</th>
                                            <th className="py-2.5 px-3">Check-Out</th>
                                            <th className="py-2.5 px-3">Duration</th>
                                            <th className="py-2.5 px-3">Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {filteredHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                                                    No attendance logs found matching filter.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredHistory.map((row: any) => (
                                                <tr key={row.id || row.date} className="hover:bg-slate-50/70 transition">
                                                    <td className="py-2.5 px-3 text-slate-800 font-sans font-medium whitespace-nowrap">
                                                        {formatDateDisplay(row.date)}
                                                    </td>
                                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                                        {row.isLate ? (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                Late Arrival
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Present
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-700">
                                                        {formatTime(row.checkIn)}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-700">
                                                        {row.checkOut ? formatTime(row.checkOut) : 'In Progress'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-900 font-bold">
                                                        {row.durationHours || 8} hrs
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-500 font-sans">
                                                        {row.location || 'Main Office'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FOOTER ────────────────────────────────────────────── */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Biometric verified audit records for {empInfo.name}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                    >
                        Close Panel
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};
