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

const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<{ status: 'OUT' | 'IN' | 'COMPLETED', checkInTime?: string } | null>(null);
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
                setTimer(`${h.toString().padStart(2, '0')} : ${m.toString().padStart(2, '0')} : ${s.toString().padStart(2, '0')}`);
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
        } catch (err) {
            alert('Check-in failed');
        }
    };

    const handleCheckOut = async () => {
        try {
            const { data } = await api.post('/attendance/check-out');
            setAttendance(data);
        } catch (err) {
            alert('Check-out failed');
        }
    };

    if (loading) return (
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
            {/* BANNER WITH REFRESHED IMAGE */}
            <div className="relative h-[180px] w-full bg-[url('https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/20"></div>
                <button className="absolute top-4 right-6 bg-white/20 p-1.5 rounded hover:bg-white/40 transition-colors">
                    <MoreHorizontal size={16} className="text-white" />
                </button>
            </div>

            <div className="max-w-[1550px] mx-auto px-6 -mt-16 relative z-10 grid grid-cols-12 gap-6">
                {/* PROFILE CARD - COMPACT ZOHO STYLE */}
                <div className="col-span-12 lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm p-1">
                            <div className="w-full h-full bg-slate-200 rounded flex items-center justify-center">
                                <span className="text-2xl font-light text-slate-400">{user?.name.charAt(0)}</span>
                            </div>
                        </div>
                        <h2 className="text-[13px] font-bold text-slate-800 text-center">1 - {user?.name}</h2>
                        <p className={`text-[12px] font-bold mt-1 text-center ${attendance?.status === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {attendance?.status === 'IN' ? 'In' : 'Out'}
                        </p>
                        <div className="text-[18px] font-mono font-bold text-slate-800 mt-2 mb-4 tracking-widest">
                            {timer}
                        </div>
                        <button
                            onClick={attendance?.status === 'IN' ? handleCheckOut : handleCheckIn}
                            className={`w-full py-1.5 rounded border transition-all text-[12px] font-bold ${attendance?.status === 'IN'
                                    ? 'border-rose-200 text-rose-500 bg-rose-50/30 hover:bg-rose-50'
                                    : 'border-emerald-500/50 text-emerald-600 hover:bg-emerald-50'
                                }`}
                        >
                            {attendance?.status === 'IN' ? 'Check out' : 'Check in'}
                        </button>
                    </div>
                </div>

                {/* CONTENT HUB */}
                <div className="col-span-12 lg:col-span-10 space-y-6">
                    <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                        {/* Inner Tabs */}
                        <div className="px-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex space-x-10 text-[13px]">
                                {['Activities', 'Feeds', 'Profile', 'Approvals', 'Leave', 'Attendance', 'Time Logs', 'Timesheets'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 px-1 border-b-2 transition-all relative ${activeTab === tab ? 'text-blue-600 border-blue-600 font-bold' : 'text-slate-500 border-transparent hover:text-slate-800'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="p-1.5 hover:bg-slate-50 cursor-pointer rounded border border-slate-200 transition-colors">
                                <LayoutGrid size={14} className="text-slate-400" />
                            </div>
                        </div>

                        {/* Module Content */}
                        <div className="p-6 space-y-6 bg-[#F9FBFC] flex-1">
                            {/* Promo Banner */}
                            <div className="bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-[4px] p-5 flex items-center justify-between text-white shadow-sm">
                                <div>
                                    <h3 className="text-[14px] font-bold">Schedule a free demo</h3>
                                    <p className="text-[12px] text-white/90 mt-0.5">Get an expert walkthrough, tailored to your business needs.</p>
                                </div>
                                <button className="bg-[#fb4d3d] hover:bg-[#e63e2d] px-5 py-2 rounded text-[12px] font-bold transition-transform hover:scale-105 shadow-sm">Request Demo</button>
                            </div>

                            {/* Welcome Card */}
                            <div className="bg-white rounded-[8px] border border-slate-100 p-6 flex items-center justify-between shadow-sm group">
                                <div className="flex items-center space-x-5">
                                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center p-2 group-hover:bg-blue-50/50 transition-colors">
                                        <img src="https://logowik.com/content/uploads/images/zoho-people7449.jpg" className="opacity-80 group-hover:opacity-100 transition-opacity" alt="Z" />
                                    </div>
                                    <div>
                                        <h3 className="text-[16px] font-bold text-slate-800">Good Evening {user?.name}</h3>
                                        <p className="text-[13px] text-slate-500 mt-0.5">Have a productive day!</p>
                                    </div>
                                </div>
                                <div className="text-slate-200 group-hover:text-blue-200 transition-colors">
                                    <Moon size={32} />
                                </div>
                            </div>

                            {/* Schedule Timeline */}
                            <div className="bg-white rounded-[8px] border border-slate-100 p-6 shadow-sm">
                                <div className="flex items-center space-x-4 mb-8">
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                                        <CalendarDays size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-[14px] font-bold">Work Schedule</h4>
                                        <p className="text-[11px] text-slate-400 font-medium">15-Feb-2026 - 21-Feb-2026</p>
                                    </div>
                                </div>

                                <div className="px-5 py-3.5 bg-slate-50 border border-slate-100/50 rounded-md mb-10 w-full lg:w-fit">
                                    <div className="text-[12px] font-bold text-slate-700 mb-0.5">General</div>
                                    <div className="text-[11px] text-slate-400">9:00 AM - 6:00 PM</div>
                                </div>

                                <div className="px-2">
                                    <div className="relative grid grid-cols-7 h-12">
                                        {/* Background connecting line */}
                                        <div className="absolute top-[2px] left-0 w-full h-[1px] bg-slate-100 z-0"></div>

                                        {weekDays.map((day) => (
                                            <div key={day.date} className="flex flex-col items-center z-10">
                                                <div className="mb-8">
                                                    {day.isToday ? (
                                                        <div className="w-2 h-2 bg-blue-600 rounded-full ring-4 ring-blue-100"></div>
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mt-[2px]"></div>
                                                    )}
                                                </div>
                                                <span className={`text-[11px] font-bold mb-1 ${day.isToday ? 'text-blue-600' : 'text-slate-500'}`}>{day.day} {day.date}</span>
                                                {day.status && (
                                                    <span className={`text-[10px] font-black ${day.status === 'Weekend' ? 'text-amber-400' : 'text-rose-400'} uppercase tracking-tighter`}>
                                                        {day.status}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
