import React, { useState, useEffect } from 'react';
import {
    Play,
    Square,
    Moon,
    MoreHorizontal,
    LayoutGrid,
    CalendarDays
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import Profile from '../../profile/pages/Profile';

const Dashboard: React.FC = () => {

    const { user } = useAuthStore();

    const [loading, setLoading] = useState(true);

    const [attendance, setAttendance] = useState<{
        status: 'OUT' | 'IN' | 'COMPLETED',
        checkInTime?: string
    } | null>(null);

    const [timer, setTimer] = useState('00 : 00 : 00');

    const [activeTab, setActiveTab] = useState('Activities');

    useEffect(() => {

        const fetchData = async () => {

            try {

                const { data } = await api.get('/attendance/today');

                setAttendance(data);

            } catch (error) {

                console.error('Failed to fetch dashboard data', error);

            } finally {

                setLoading(false);

            }

        };

        fetchData();

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

                setTimer(
                    `${h.toString().padStart(2, '0')} : ${m
                        .toString()
                        .padStart(2, '0')} : ${s.toString().padStart(2, '0')}`
                );

            }, 1000);

        } else {

            setTimer('00 : 00 : 00');

        }

        return () => clearInterval(interval);

    }, [attendance]);

    const handleCheckIn = async () => {

        try {

            const { data } = await api.post('/attendance/check-in');

            setAttendance(data);

        } catch {

            alert('Check-in failed');

        }

    };

    const handleCheckOut = async () => {

        try {

            const { data } = await api.post('/attendance/check-out');

            setAttendance(data);

        } catch {

            alert('Check-out failed');

        }

    };

    if (loading)
        return (
            <div className="p-8 space-y-4">
                <div className="h-40 bg-slate-200 rounded animate-pulse w-full"></div>
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-3 h-64 bg-slate-100 rounded animate-pulse"></div>
                    <div className="col-span-9 h-64 bg-slate-100 rounded animate-pulse"></div>
                </div>
            </div>
        );

    const weekDays = [
        { day: 'Sun', date: '15', status: 'Weekend' },
        { day: 'Mon', date: '16', status: 'Absent' },
        { day: 'Tue', date: '17', status: 'Absent' },
        { day: 'Wed', date: '18', status: 'Absent' },
        { day: 'Thu', date: '19', status: 'Today', isToday: true },
        { day: 'Fri', date: '20', status: '' },
        { day: 'Sat', date: '21', status: 'Weekend' },
    ];

    return (
        <div className="min-h-screen bg-[#F4F7F9] font-sans text-sm pb-10">

            {/* BANNER */}
            <div className="relative h-[180px] w-full bg-[url('https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/20"></div>

                <button className="absolute top-4 right-6 bg-white/20 p-1.5 rounded hover:bg-white/40 transition-colors">
                    <MoreHorizontal size={16} className="text-white" />
                </button>
            </div>

            <div className="max-w-[1550px] mx-auto px-6 -mt-16 relative z-10 grid grid-cols-12 gap-6">

                {/* PROFILE CARD */}
                <div className="col-span-12 lg:col-span-2 space-y-6">

                    <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 flex flex-col items-center">

                        <div className="w-20 h-20 bg-slate-100 rounded-lg mb-4 flex items-center justify-center">

                            <span className="text-2xl font-light text-slate-400">
                                {user?.name.charAt(0)}
                            </span>

                        </div>

                        <h2 className="text-[13px] font-bold text-slate-800 text-center">
                            1 - {user?.name}
                        </h2>

                        <p className={`text-[12px] font-bold mt-1 text-center ${
                            attendance?.status === 'IN'
                                ? 'text-emerald-500'
                                : 'text-rose-500'
                        }`}>
                            {attendance?.status === 'IN' ? 'In' : 'Out'}
                        </p>

                        <div className="text-[18px] font-mono font-bold text-slate-800 mt-2 mb-4 tracking-widest">
                            {timer}
                        </div>

                        <button
                            onClick={
                                attendance?.status === 'IN'
                                    ? handleCheckOut
                                    : handleCheckIn
                            }
                            className={`w-full py-1.5 rounded border text-[12px] font-bold ${
                                attendance?.status === 'IN'
                                    ? 'border-rose-200 text-rose-500'
                                    : 'border-emerald-500 text-emerald-600'
                            }`}
                        >
                            {attendance?.status === 'IN'
                                ? 'Check out'
                                : 'Check in'}
                        </button>

                    </div>

                </div>

                {/* CONTENT HUB */}
                <div className="col-span-12 lg:col-span-10 space-y-6">

                    <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">

                        {/* Tabs */}
                        <div className="px-6 border-b border-slate-100 flex items-center justify-between">

                            <div className="flex space-x-10 text-[13px]">

                                {[
                                    'Activities',
                                    'Feeds',
                                    'Profile',
                                    'Approvals',
                                    'Leave',
                                    'Attendance',
                                    'Time Logs',
                                    'Timesheets',
                                ].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 px-1 border-b-2 ${
                                            activeTab === tab
                                                ? 'text-blue-600 border-blue-600 font-bold'
                                                : 'text-slate-500 border-transparent'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <LayoutGrid size={14} className="text-slate-400" />

                        </div>

                        {/* CONTENT AREA */}
                        <div className="p-6 bg-[#F9FBFC] flex-1">

                            {activeTab === "Profile" ? (

                                <Profile />

                            ) : (

                                <>
                                    {/* Activities Content */}

                                    <div className="bg-white rounded-[8px] border border-slate-100 p-6 flex items-center justify-between shadow-sm">

                                        <div>

                                            <h3 className="text-[16px] font-bold text-slate-800">
                                                Good Evening {user?.name}
                                            </h3>

                                            <p className="text-[13px] text-slate-500 mt-0.5">
                                                Have a productive day!
                                            </p>

                                        </div>

                                        <Moon size={32} />

                                    </div>

                                    <div className="bg-white rounded-[8px] border border-slate-100 p-6 mt-6 shadow-sm">

                                        <h4 className="text-[14px] font-bold mb-6">
                                            Work Schedule
                                        </h4>

                                        <div className="grid grid-cols-7 gap-4">

                                            {weekDays.map((day) => (

                                                <div
                                                    key={day.date}
                                                    className="text-center"
                                                >

                                                    <p className="text-xs font-bold">
                                                        {day.day}
                                                    </p>

                                                    <p className="text-sm">
                                                        {day.date}
                                                    </p>

                                                </div>

                                            ))}

                                        </div>

                                    </div>

                                </>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;