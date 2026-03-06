
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
    const [attendance, setAttendance] = useState<{
        status: 'OUT' | 'IN' | 'COMPLETED',
        checkInTime?: string
    } | null>(null);

    const [timer, setTimer] = useState('00:00:00');

    // Fetch today's attendance
    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const { data } = await api.get('/api/v1/attendance/today', {
                    params: { userId: user?.id }
                });

                setAttendance({
                    status: data.status,
                    checkInTime: data.checkIn
                });

            } catch (error) {
                console.error('Failed to fetch attendance', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchAttendance();
        }
    }, [user]);

    // Timer logic
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

                setTimer(
                    `${h.toString().padStart(2, '0')}:` +
                    `${m.toString().padStart(2, '0')}:` +
                    `${s.toString().padStart(2, '0')}`
                );
            }, 1000);
        } else {
            setTimer('00:00:00');
        }

        return () => clearInterval(interval);
    }, [attendance]);

    // Check-in / Check-out handler
    const handleAttendance = async () => {
        try {
            if (!user?.id) return;

            if (attendance?.status === 'IN') {

                const { data } = await api.post('/api/v1/attendance/check-out', {
                    userId: user.id
                });

                setAttendance({
                    status: 'COMPLETED',
                    checkInTime: data.check_in
                });

            } else {

                const { data } = await api.post('/api/v1/attendance/check-in', {
                    userId: user.id
                });

                setAttendance({
                    status: 'IN',
                    checkInTime: data.check_in
                });

            }

        } catch (error) {
            console.error("Attendance action failed", error);
        }
    };

    const weekDays = [
        { day: 'Sun', date: '15', status: 'Weekend', color: 'bg-amber-100 text-amber-700', barColor: 'bg-amber-200' },
        { day: 'Mon', date: '16', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Tue', date: '17', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Wed', date: '18', status: 'Absent', color: 'bg-rose-100 text-rose-700', barColor: 'bg-rose-200' },
        { day: 'Thu', date: '19', status: 'Today', isToday: true },
    ];

    if (loading) {
        return <div className="p-8 animate-pulse bg-slate-50 h-screen">Loading Attendance...</div>;
    }

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
                        <button className="p-1 hover:bg-slate-50 rounded border border-slate-200 text-slate-400">
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center space-x-2 border border-slate-200 rounded px-3 py-1 bg-white cursor-pointer hover:border-slate-300 shadow-sm">
                            <CalendarIcon size={14} className="text-slate-500" />
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>

                        <button className="p-1 hover:bg-slate-50 rounded border border-slate-200 text-slate-400">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <span className="text-[13px] font-bold text-slate-700">
                        15-Feb-2026 - 21-Feb-2026
                    </span>
                </div>

                <div className="flex items-center space-x-1">
                    <button className="p-1.5 bg-blue-50 text-blue-600 rounded border border-blue-200">
                        <LayoutGrid size={14} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200">
                        <List size={14} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200">
                        <CalendarDays size={14} />
                    </button>

                    <div className="w-px h-4 bg-slate-200 mx-2"></div>

                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200">
                        <SlidersHorizontal size={14} />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:bg-slate-50 rounded border border-slate-200">
                        <MoreHorizontal size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

                {/* Active Session Card */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center justify-between">

                    <div className="flex items-center space-x-4">
                        <span className="text-[13px] font-bold text-slate-800">
                            General [ 9:00 AM - 6:00 PM ]
                        </span>

                        <div className="w-px h-6 bg-slate-200"></div>

                        <input
                            type="text"
                            placeholder="Add notes for check-in"
                            className="text-[12px] border border-slate-100 rounded px-3 py-1.5 w-64 focus:ring-1 focus:ring-blue-100 focus:border-blue-200 outline-none bg-slate-50/50"
                        />
                    </div>

                    <div className="flex items-center space-x-3">

                        <button
                            onClick={handleAttendance}
                            className={`flex items-center space-x-3 px-6 py-2 rounded text-white font-bold text-[13px] shadow-lg transition-all active:scale-95 ${
                                attendance?.status === 'IN'
                                    ? 'bg-rose-500 shadow-rose-500/20'
                                    : 'bg-[#00c853]'
                            }`}
                        >

                            <div className="flex flex-col items-start leading-tight border-r border-white/20 pr-3 mr-1">
                                <span className="text-[10px] opacity-80 uppercase tracking-tighter">
                                    {attendance?.status === 'IN'
                                        ? 'Active Session'
                                        : 'Manual Entry'}
                                </span>

                                <span className="text-[14px] font-black">
                                    {attendance?.status === 'IN'
                                        ? 'Check-out'
                                        : 'Check-in'}
                                </span>
                            </div>

                            <span className="text-[16px] font-mono">
                                {timer} Hrs
                            </span>

                            <div className="bg-white/20 p-1 rounded-full">
                                <Info size={12} />
                            </div>

                        </button>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default Attendance;

