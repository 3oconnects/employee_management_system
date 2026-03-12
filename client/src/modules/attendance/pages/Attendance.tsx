import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutGrid,
    List,
    CalendarDays,
    SlidersHorizontal,
    MoreHorizontal,
    Info,
    ChevronDown
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

const Attendance: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<{ status: 'OUT' | 'IN' | 'COMPLETED', checkInTime?: string } | null>(null);
    const [timer, setTimer] = useState('00:00:00');

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const { data } = await api.get('/attendance/today');
                setAttendance(data);
            } catch (error) {
                console.error('Failed to fetch attendance', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    useEffect(() => {
        let interval: any;
        if (attendance?.status === 'IN' && attendance.checkInTime) {
            interval = setInterval(() => {
                const start = new Date(attendance.checkInTime!).getTime();
                const now = new Date().getTime();
                const diff = now - start;
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setTimer(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            }, 1000);
        } else {
            setTimer('00:00:00');
        }
        return () => clearInterval(interval);
    }, [attendance]);

    const weekDays = [
        { day: 'Sun', date: '15', status: 'Weekend', color: 'bg-amber-100 text-amber-700', barColor: 'bg-amber-200' },
        { day: 'Mon', date: '16', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Tue', date: '17', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Wed', date: '18', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Thu', date: '19', status: 'Today', isToday: true },
    ];

    if (loading) return <div className="p-8 animate-pulse bg-slate-50 h-screen">Loading Attendance...</div>;

    return (
        <div className="flex flex-col h-full bg-[#f4f7f9] font-sans overflow-hidden">
            {/* Tab Header */}
            <div className="bg-[#1d2b4d] text-white px-6 h-[40px] flex items-center shadow-sm">
                <div className="h-full flex items-center border-b-2 border-blue-500 px-1 font-bold text-[13px] tracking-tight mr-8">
                    Attendance Summary
                </div>
                <div className="h-full flex items-center text-slate-300 hover:text-white cursor-pointer text-[13px] font-medium transition-colors">
                    Shift
                </div>
            </div>

            {/* Sub Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-4 mx-auto">
                    <div className="flex items-center space-x-1">
                        <button className="p-1 hover:bg-slate-50 rounded border border-slate-200 text-slate-400 group"><ChevronLeft size={16} /></button>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded px-3 py-1 bg-white cursor-pointer hover:border-slate-300 shadow-sm">
                            <CalendarIcon size={14} className="text-slate-500" />
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>
                        <button className="p-1 hover:bg-slate-50 rounded border border-slate-200 text-slate-400 group"><ChevronRight size={16} /></button>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700">15-Feb-2026 - 21-Feb-2026</span>
                </div>

                <div className="flex items-center space-x-1">
                    <button className="p-1.5 bg-blue-50 text-blue-600 rounded border border-blue-200 transition-all shadow-sm"><LayoutGrid size={14} /></button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200 transition-all"><List size={14} /></button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200 transition-all"><CalendarDays size={14} /></button>
                    <div className="w-px h-4 bg-slate-200 mx-2"></div>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200 transition-all"><SlidersHorizontal size={14} /></button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200 transition-all"><MoreHorizontal size={14} /></button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Active Session Card */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center justify-between group hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                        <span className="text-[13px] font-bold text-slate-800">General [ 9:00 AM - 6:00 PM ]</span>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <input
                            type="text"
                            placeholder="Add notes for check-in"
                            className="text-[12px] border border-slate-100 rounded px-3 py-1.5 w-64 focus:ring-1 focus:ring-blue-100 focus:border-blue-200 transition-all outline-none bg-slate-50/50"
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <button className={`flex items-center space-x-3 px-6 py-2 rounded text-white font-bold text-[13px] shadow-lg shadow-emerald-500/20 transition-all active:scale-95 ${attendance?.status === 'IN' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-[#00c853]'}`}>
                            <div className="flex flex-col items-start leading-tight border-r border-white/20 pr-3 mr-1">
                                <span className="text-[10px] opacity-80 uppercase tracking-tighter">{attendance?.status === 'IN' ? 'Active Session' : 'Manual Entry'}</span>
                                <span className="text-[14px] font-black">{attendance?.status === 'IN' ? 'Check-out' : 'Check-in'}</span>
                            </div>
                            <span className="text-[16px] font-mono">{timer} Hrs</span>
                            <div className="bg-white/20 p-1 rounded-full"><Info size={12} /></div>
                        </button>
                    </div>
                </div>

                {/* Week View Timeline */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex-1 space-y-0.5 bg-slate-50">
                        {weekDays.map((wd, i) => (
                            <div key={i} className={`flex items-center h-[74px] bg-white border-b border-slate-50/50 px-6 group transition-colors hover:bg-slate-50/30`}>
                                <div className="w-16 flex flex-col items-center">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{wd.day}</span>
                                    <span className={`text-[15px] font-bold ${wd.isToday ? 'text-blue-600' : 'text-slate-700'}`}>{wd.date}</span>
                                </div>
                                <div className="flex-1 flex items-center px-10 relative">
                                    <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100"></div>
                                    <div className="w-[1px] h-3 bg-slate-200 relative z-10 left-0"></div>

                                    <div className="flex-1 flex justify-center items-center relative z-20">
                                        {wd.status && wd.status !== 'Today' && (
                                            <div className={`${wd.color} px-3 py-0.5 rounded border border-current/20 text-[10px] font-black uppercase tracking-widest shadow-sm`}>
                                                {wd.status}
                                            </div>
                                        )}
                                        {wd.isToday && (
                                            <div className="flex flex-col items-end absolute right-0">
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-1"></div>
                                                    <span className="text-[11px] font-black text-slate-800 tracking-tighter">09:22 PM</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-[1px] h-3 bg-slate-200 relative z-10 right-0"></div>
                                </div>
                                <div className="w-32 flex flex-col items-end">
                                    <span className="text-[13px] font-black text-slate-700 tracking-tighter">00:00</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Hrs worked</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Timeline X-Axis */}
                    <div className="h-10 border-t border-slate-100 flex items-center px-[100px] bg-slate-50 text-[10px] font-bold text-slate-400 overflow-x-auto whitespace-nowrap">
                        {['09AM', '10AM', '11AM', '12PM', '01PM', '02PM', '03PM', '04PM', '05PM', '06PM'].map((t, i) => (
                            <div key={i} className="flex-1 flex items-center">
                                <span className="mr-8">{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Insight Footer */}
            <div className="bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] flex flex-col">
                <div className="h-11 flex border-b border-slate-100">
                    <div className="w-32 flex items-center justify-center border-r border-slate-100 bg-white">
                        <button className="h-full w-full flex items-center px-4 space-x-2">
                            <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
                            <span className="text-[12px] font-bold text-slate-800">Days</span>
                        </button>
                    </div>
                    <div className="w-32 flex items-center justify-center bg-slate-50/50">
                        <button className="h-full w-full flex items-center px-4 space-x-2 opacity-50">
                            <span className="text-[12px] font-bold text-slate-800">Hours</span>
                        </button>
                    </div>
                </div>
                <div className="p-4 flex items-center justify-between px-8 bg-white overflow-x-auto">
                    <div className="flex items-center space-x-12">
                        {[
                            { label: 'Payable Days', val: '2 Days', color: 'blue-600' },
                            { label: 'Present', val: '0 Day', color: 'emerald-600' },
                            { label: 'On Duty', val: '0 Day', color: 'indigo-500' },
                            { label: 'Paid leave', val: '0 Day', color: 'amber-600' },
                            { label: 'Holidays', val: '0 Day', color: 'sky-500' },
                            { label: 'Weekend', val: '2 Days', color: 'orange-500' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col border-l border-slate-100 pl-4 h-8 justify-center">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">{stat.label}</span>
                                <span className={`text-[12px] font-black text-${stat.color} leading-none tracking-tight`}>{stat.val}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Shift:</span>
                        <span className="text-[12px] font-black text-slate-800 tracking-tight">General [ 9:00 AM - 6:00 PM ]</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
