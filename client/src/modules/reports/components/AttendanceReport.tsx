import React, { useState } from 'react';
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    MapPin, 
    Search, 
    BarChart2, 
    ArrowUpRight, 
    User, 
    CalendarCheck, 
    Filter,
    Activity,
    Calendar,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { EmployeeAttendanceModal } from './EmployeeAttendanceModal';

interface AttendanceReportProps {
    data: {
        avgCompliance: string;
        todayPresent: number;
    };
    totalEmployees: number;
    log: any[];
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ data, totalEmployees, log }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

    const absent = Math.max(0, totalEmployees - data.todayPresent);
    const presentRate = totalEmployees > 0 ? Math.round((data.todayPresent / totalEmployees) * 100) : 0;
    const absentRate = totalEmployees > 0 ? Math.round((absent / totalEmployees) * 100) : 0;

    const filteredLog = (log || []).filter(entry => {
        const matchesSearch = 
            (entry.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.position || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;
        if (statusFilter === 'present') return !!entry.check_in;
        if (statusFilter === 'absent') return !entry.check_in;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* ── KPI Stat Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-500">Present Today</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.todayPresent}</p>
                        <span className="text-xs font-semibold text-emerald-600">({presentRate}%)</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${presentRate}%` }} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-500">Absent / On Leave</span>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{absent}</p>
                        <span className="text-xs font-semibold text-rose-600">({absentRate}%)</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${absentRate}%` }} />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-500">30-Day Avg. Compliance</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.avgCompliance}%</p>
                        <span className="text-xs font-semibold text-slate-500">Monthly Avg</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${data.avgCompliance}%` }} />
                    </div>
                </div>
            </div>

            {/* ── Attendance Log Table ───────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Operational Attendance & Workforce Analytics</h3>
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                Click any employee for individual deep-dive
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Real-time biometric check-in timestamps, monthly presence rates, hours worked, and individual drill-downs
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5">
                        {/* Status Filter */}
                        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/80 text-xs font-semibold">
                            {[
                                { id: 'all', label: 'All Staff' },
                                { id: 'present', label: 'Present' },
                                { id: 'absent', label: 'Absent' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setStatusFilter(tab.id as any)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                        statusFilter === tab.id
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white w-52 transition-all"
                            />
                        </div>

                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Sync
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                                <th className="px-5 py-3.5">Employee & ID</th>
                                <th className="px-4 py-3.5">Status Today</th>
                                <th className="px-4 py-3.5">Today's Punch</th>
                                <th className="px-4 py-3.5">Days Present (Mo)</th>
                                <th className="px-4 py-3.5">Total Hours (Mo)</th>
                                <th className="px-4 py-3.5">Location Hub</th>
                                <th className="px-5 py-3.5 text-right">Individual Analysis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLog.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                                        No employee attendance entries match your current search or status filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredLog.map((entry, i) => {
                                    const daysPresent = entry.days_present !== undefined ? entry.days_present : (entry.check_in ? 1 : 0);
                                    const presenceRate = Math.min(100, Math.round((daysPresent / 22) * 100));
                                    const totalHours = entry.total_hours ? parseFloat(entry.total_hours).toFixed(1) : (daysPresent * 8.0).toFixed(1);
                                    const avgDaily = entry.avg_daily_hours ? parseFloat(entry.avg_daily_hours).toFixed(1) : '8.0';

                                    return (
                                        <tr 
                                            key={entry.id || i} 
                                            onClick={() => setSelectedEmployee(entry)}
                                            className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                                        >
                                            {/* 1. Employee Profile */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0 group-hover:border-indigo-300 group-hover:bg-indigo-50 transition-colors">
                                                        {entry.avatar_url ? (
                                                            <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover rounded-xl" />
                                                        ) : (
                                                            (entry.name || 'E').charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                                {entry.name}
                                                            </p>
                                                            <span className="font-mono text-[9.5px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded">
                                                                {entry.employee_id || `EMP-${entry.id}`}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400">
                                                            {entry.position || 'Specialist'} &bull; <span className="font-medium text-slate-600">{entry.department || 'General'}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 2. Today's Status */}
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                                    entry.check_in
                                                        ? entry.check_out
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        entry.check_in 
                                                            ? entry.check_out ? 'bg-blue-500' : 'bg-emerald-500 animate-pulse'
                                                            : 'bg-rose-500'
                                                    }`} />
                                                    {entry.check_in ? (entry.check_out ? 'Completed' : 'Checked In') : 'Absent'}
                                                </span>
                                            </td>

                                            {/* 3. Today's Punch Activity */}
                                            <td className="px-4 py-3.5">
                                                <div className="space-y-0.5">
                                                    <div className="font-mono font-medium text-slate-700 text-[11.5px]">
                                                        {entry.check_in
                                                            ? new Date(entry.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                            : '--:--'}
                                                        {entry.check_out && (
                                                            <span className="text-slate-400"> &rarr; {new Date(entry.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        )}
                                                    </div>
                                                    {entry.today_hours > 0 && (
                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                            Today: <span className="font-mono text-slate-600 font-bold">{entry.today_hours} hrs</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 4. Monthly Presence */}
                                            <td className="px-4 py-3.5">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-black text-slate-800 text-xs font-mono">{daysPresent} Days</span>
                                                        <span className="text-[10.5px] font-semibold text-emerald-600 font-mono">({presenceRate}%)</span>
                                                    </div>
                                                    <div className="mt-1 h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${presenceRate}%` }} />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 5. Total Hours Worked */}
                                            <td className="px-4 py-3.5">
                                                <div>
                                                    <p className="font-black text-slate-800 text-xs font-mono">
                                                        {totalHours} hrs
                                                    </p>
                                                    <p className="text-[10.5px] text-slate-400 font-mono">
                                                        avg {avgDaily}h / day
                                                    </p>
                                                </div>
                                            </td>

                                            {/* 6. Location Hub */}
                                            <td className="px-4 py-3.5 text-slate-600">
                                                <span className="inline-flex items-center gap-1 text-slate-600 text-[11px]">
                                                    <MapPin size={12} className="text-slate-400" />
                                                    {entry.location || 'Main Office'}
                                                </span>
                                            </td>

                                            {/* 7. Action Button */}
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedEmployee(entry);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 group-hover:bg-indigo-600 text-slate-700 group-hover:text-white transition-all shadow-2xs"
                                                >
                                                    <BarChart2 size={13} />
                                                    <span>View Analysis</span>
                                                    <ArrowUpRight size={12} className="opacity-70" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── INDIVIDUAL EMPLOYEE ATTENDANCE DEEP DIVE MODAL ───── */}
            {selectedEmployee && (
                <EmployeeAttendanceModal
                    employee={selectedEmployee}
                    onClose={() => setSelectedEmployee(null)}
                />
            )}
        </div>
    );
};
export default AttendanceReport;
