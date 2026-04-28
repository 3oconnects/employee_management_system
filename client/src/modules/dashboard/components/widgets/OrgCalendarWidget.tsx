import React, { useState, useEffect } from 'react';
import { CalendarDays, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../services/api';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const OrgCalendarWidget: React.FC = () => {
    const [offset, setOffset] = useState(0); // 0 = this month
    const [holidays, setHolidays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get('/reports/holidays');
                const list = Array.isArray(data) ? data : (data?.items || data?.holidays || []);
                setHolidays(list);
            } catch { setHolidays([]); }
            finally { setLoading(false); }
        })();
    }, []);

    const now = new Date();
    const viewDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = now.toISOString().split('T')[0];

    // Holiday lookup
    const holidayMap = new Map<number, string>();
    holidays.forEach(h => {
        const d = new Date(h.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
            holidayMap.set(d.getDate(), h.name);
        }
    });

    // Build calendar grid
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center">
                        <CalendarDays size={16} className="text-rose-500"/>
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black text-slate-800">Organization Calendar</h3>
                        <p className="text-[11px] text-slate-400">{holidays.length} holidays this year</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setOffset(o => o - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                        <ChevronLeft size={13}/>
                    </button>
                    <span className="text-[12px] font-bold text-slate-700 min-w-[120px] text-center">
                        {MONTHS[month]} {year}
                    </span>
                    <button onClick={() => setOffset(o => o + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                        <ChevronRight size={13}/>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={18} className="animate-spin text-indigo-400 mr-2"/>
                    <p className="text-[12px] text-slate-400">Loading calendar…</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {/* Weekday header */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {WEEKDAYS.map(w => (
                            <div key={w} className="py-2.5 text-center">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${w === 'Sun' || w === 'Sat' ? 'text-slate-300' : 'text-slate-400'}`}>{w}</span>
                            </div>
                        ))}
                    </div>
                    {/* Days grid */}
                    <div className="grid grid-cols-7">
                        {cells.map((day, i) => {
                            if (day === null) return <div key={i} className="p-2 min-h-[56px] bg-slate-50/50"/>;
                            const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isToday = ds === todayStr;
                            const isWeekend = i % 7 === 0 || i % 7 === 6;
                            const holiday = holidayMap.get(day);
                            return (
                                <div key={i} className={`p-2 min-h-[56px] border-t border-r border-slate-50 transition-all
                                    ${isToday ? 'bg-indigo-50' : holiday ? 'bg-rose-50/50' : isWeekend ? 'bg-slate-50/30' : ''}`}>
                                    <p className={`text-[12px] font-bold mb-0.5
                                        ${isToday ? 'text-indigo-700 bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[11px]' :
                                          holiday ? 'text-rose-600' :
                                          isWeekend ? 'text-slate-300' : 'text-slate-600'}`}>
                                        {day}
                                    </p>
                                    {holiday && (
                                        <p className="text-[8px] font-bold text-rose-500 leading-tight truncate">{holiday}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Upcoming holidays legend */}
            {holidays.filter(h => new Date(h.date) >= now).slice(0, 3).length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
                    {holidays.filter(h => new Date(h.date) >= now).slice(0, 3).map(h => (
                        <div key={h.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"/>
                            <span className="text-[11px] font-semibold text-slate-700">{h.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">
                                {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrgCalendarWidget;
