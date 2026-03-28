import React, { useState, useEffect } from 'react';
import {
    LogIn,
    LogOut as LogOutIcon,
    CheckCircle,
    CalendarDays,
    Users,
    FileText,
    ClipboardList,
    Star,
    Bell,
    TrendingUp,
    Layers,
    AlertCircle,
    Sun,
    Moon,
    Sunset,
    ArrowUpRight,
    Clock,
    UserCircle,
    Settings,
    Shield,
    Coffee,
    Zap,
    MessageSquare,
    Briefcase,
    LayoutDashboard,
    Rocket,
    Loader2,
    ChevronRight,
    Activity
} from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import Profile from '../../profile/pages/Profile';

/* ─── Types ─────────────────────────────────────────────── */
interface AttendanceState {
    status: 'OUT' | 'IN' | 'COMPLETED';
    checkInTime?: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning',   icon: Sun,    sub: 'Ready to seize the day?' };
    if (h < 17) return { text: 'Good Afternoon', icon: Sunset, sub: 'Stay productive & hydrated!' };
    return            { text: 'Good Evening',    icon: Moon,   sub: 'Wrapping up for the day?' };
}

function fmtClock(ms: number) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ─── Activity row ───────────────────────────────────────── */
const Feed: React.FC<{
    icon: React.ElementType; bg: string; ic: string;
    title: string; desc: string; time: string;
}> = ({ icon: Icon, bg, ic, title, desc, time }) => (
    <div className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/80 transition-all rounded-2xl group cursor-default">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
            <Icon size={16} className={ic} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors">{title}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium leading-relaxed">{desc}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wider group-hover:text-gray-500">{time}</span>
        </div>
    </div>
);

/* ─── TABS ───────────────────────────────────────────────── */
const TABS = [
    { id: 'Activities', icon: LayoutDashboard },
    { id: 'Profile',    icon: UserCircle },
    { id: 'Approvals',  icon: Shield },
    { id: 'Leave',      icon: CalendarDays },
    { id: 'Shift',      icon: Clock },
];

/* ─── Dashboard ─────────────────────────────────────────── */
const Dashboard: React.FC = () => {
    const { user } = useAuthStore();
    const [attendance, setAttendance] = useState<AttendanceState | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [elapsed,    setElapsed]    = useState(0);
    const [activeTab,  setActiveTab]  = useState('Activities');
    const [checkingIn, setCheckingIn] = useState(false);
    const [activity,   setActivity]   = useState<any[]>([]);

    const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? 'U';
    const greeting = getGreeting();
    const GreetIcon = greeting.icon;
    const isIn   = attendance?.status === 'IN';
    const isDone = attendance?.status === 'COMPLETED';

    useEffect(() => {
        if (!user?.id) return;
        Promise.all([
            api.get('/attendance/today', { params: { userId: user.id } }),
            api.get('/payroll/activity')
        ]).then(([att, act]) => {
            setAttendance(att.data);
            setActivity(act.data || []);
        }).catch(() => {})
        .finally(() => setLoading(false));
    }, [user?.id]);

    useEffect(() => {
        if (!isIn || !attendance?.checkInTime) { setElapsed(0); return; }
        const base = new Date(attendance.checkInTime).getTime();
        const tick = () => setElapsed(Date.now() - base);
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [attendance, isIn]);

    const handleCheckIn = async () => {
        if (!user?.id || checkingIn) return;
        setCheckingIn(true);
        try {
            const { data } = await api.post('/attendance/check-in', { userId: user.id });
            setAttendance(data);
        } catch { alert('Check-in failed'); }
        finally { setCheckingIn(false); }
    };

    const handleCheckOut = async () => {
        if (!user?.id || checkingIn) return;
        setCheckingIn(true);
        try {
            const { data } = await api.post('/attendance/check-out', { userId: user.id });
            setAttendance(data);
        } catch { alert('Check-out failed'); }
        finally { setCheckingIn(false); }
    };

    if (loading) return (
        <div className="p-8 space-y-8 animate-pulse">
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-3 h-96 bg-gray-50 rounded-[2.5rem]"></div>
                <div className="col-span-12 lg:col-span-9 h-96 bg-white rounded-[2.5rem] border border-gray-100"></div>
            </div>
        </div>
    );

    const todayStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20 page-enter">
            
            <div className="max-w-[1500px] mx-auto px-8 py-8 space-y-8">
                
                {/* ── Integrated Hero Header ────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center text-white text-[22px] font-black shadow-2xl shadow-blue-100 ring-4 ring-white relative group">
                            {initials}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-[24px] font-black text-gray-900 tracking-tight">{greeting.text}, {user?.name?.split(' ')[0]}!</h1>
                                <GreetIcon size={24} className="text-amber-500 animate-pulse" />
                            </div>
                            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.1em] mt-0.5">{greeting.sub}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 mb-2">
                            <Zap size={12} className="fill-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Global Sync Active</span>
                        </div>
                        <p className="text-[13px] font-black text-gray-800 uppercase tracking-tight">{todayStr}</p>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8">

                    {/* ── LEFT: Smart Sidebar ───────────────────── */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        
                        {/* Attendance Master Control */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors"></div>
                            
                            <div className="relative z-10 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance</span>
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isIn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isIn ? 'bg-emerald-500 animate-ping' : 'bg-gray-300'}`}></div>
                                    {isIn ? 'Clocked In' : isDone ? 'Finished' : 'Off Duty'}
                                </div>
                            </div>

                            <div className="relative z-10 flex flex-col items-center py-2">
                                <div className={`w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-700 ${isIn ? 'border-indigo-600 bg-indigo-50 shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)]' : 'border-gray-50 bg-gray-50'}`}>
                                    <p className={`text-[36px] font-black font-mono tracking-tighter tabular-nums leading-none ${isIn ? 'text-indigo-600' : 'text-gray-200'}`}>
                                        {isIn ? fmtClock(elapsed) : '00:00:00'}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <Clock size={12} className={isIn ? 'text-indigo-400' : 'text-gray-300'} />
                                        <p className={`text-[9.5px] font-black uppercase tracking-[0.2em] ${isIn ? 'text-indigo-400' : 'text-gray-300'}`}>
                                            {isIn ? 'Recording Live' : 'Not Tracking'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 space-y-3">
                                {!isDone ? (
                                    <button
                                        onClick={isIn ? handleCheckOut : handleCheckIn}
                                        disabled={checkingIn}
                                        className={`w-full py-4 rounded-2xl text-[14px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl ${
                                            isIn 
                                                ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-100/50 hover:bg-rose-100'
                                                : 'bg-indigo-600 text-white shadow-indigo-200/50 hover:bg-indigo-700'
                                        }`}
                                    >
                                        {checkingIn ? <Loader2 size={18} className="animate-spin" /> : isIn ? <LogOutIcon size={18} /> : <LogIn size={18} />}
                                        {isIn ? 'End Cycle' : 'Clock In Now'}
                                    </button>
                                ) : (
                                    <div className="w-full py-4 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2 text-[12px] font-bold">
                                        <CheckCircle size={18} /> Cycle Completed
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-3"><CalendarDays size={18}/></div>
                                <p className="text-[22px] font-black text-gray-900 tracking-tight">18</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Days Present</p>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all">
                                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl w-fit mb-3"><ArrowUpRight size={18}/></div>
                                <p className="text-[22px] font-black text-gray-900 tracking-tight">2</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Leave Balance</p>
                            </div>
                        </div>

                        {/* Fast Actions */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-4">
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 mb-3">Quick Actions</p>
                            {[
                                { icon: Coffee, title: 'Break Request', color: 'text-amber-500', bg: 'bg-amber-50' },
                                { icon: Rocket,  title: 'Apply Leave',   color: 'text-blue-500',  bg: 'bg-blue-50' },
                                { icon: Briefcase, title: 'Timesheet',  color: 'text-indigo-500',bg: 'bg-indigo-50' },
                                { icon: MessageSquare, title: 'Support',   color: 'text-emerald-500',bg: 'bg-emerald-50' },
                            ].map((a, i) => (
                                <button key={i} className="w-full flex items-center gap-4 px-3 py-2.5 rounded-2xl hover:bg-gray-50 transition-all text-left group">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${a.bg} ${a.color} group-hover:scale-110`}><a.icon size={16}/></div>
                                    <span className="text-[13px] font-bold text-gray-600 group-hover:text-gray-900">{a.title}</span>
                                    <ChevronRight size={12} className="ml-auto text-gray-300 group-hover:text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── RIGHT: Insight Engine ────────────────── */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        
                        {/* Interactive Tab Navigation */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="flex items-center px-10 border-b border-gray-50 gap-8">
                                {TABS.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center gap-2.5 py-6 text-[13px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                                            activeTab === tab.id
                                                ? 'border-indigo-600 text-indigo-600'
                                                : 'border-transparent text-gray-300 hover:text-gray-500'
                                        }`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.id}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                {activeTab === 'Activities' && (
                                    <div className="p-4 divide-y divide-gray-50/50">
                                        {activity.length > 0 ? activity.map((act, i) => (
                                            <Feed
                                                key={act.id || i}
                                                icon={Activity}
                                                bg="bg-indigo-50"
                                                ic="text-indigo-600"
                                                title={`Payroll Cycle: ${act.payrollcycle}`}
                                                desc={`Automated processing completed on ${new Date(act.processed_at).toLocaleDateString()}`}
                                                time="RECENT"
                                            />
                                        )) : (
                                            <>
                                                <Feed icon={Bell} bg="bg-blue-50" ic="text-blue-500" title="Cloud Infrastructure Sync" desc="Database clusters updated for real-time tracking." time="2h ago" />
                                                <Feed icon={Zap} bg="bg-amber-50" ic="text-amber-400" title="Performance Benchmark" desc="Core engine optimization completed." time="4h ago" />
                                                <Feed icon={CalendarDays} bg="bg-emerald-50" ic="text-emerald-600" title="Automated Leave Audit" desc="Enterprise leave balances verified." time="Yesterday" />
                                            </>
                                        )}
                                        
                                        <div className="p-10 text-center">
                                            <button className="px-6 py-2.5 bg-gray-50 rounded-full text-[11px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-200">
                                                Discover Deep Archive
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Profile' && <Profile />}

                                {activeTab === 'Shift' && (
                                    <div className="p-10 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500">
                                                <div>
                                                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Assignment</p>
                                                    <h4 className="text-[22px] font-black text-gray-900 uppercase tracking-tight">General Office</h4>
                                                    <p className="text-[14px] text-gray-500 font-medium mt-1">09:00 AM — 18:00 PM (GMT+5:30)</p>
                                                </div>
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100 group-hover:scale-110 transition-all">
                                                    <Briefcase size={28}/>
                                                </div>
                                            </div>
                                            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16"></div>
                                                <div className="relative z-10 flex items-center justify-between h-full">
                                                    <div>
                                                        <p className="text-[11px] font-black text-indigo-200 uppercase tracking-widest mb-2">Session Productivity</p>
                                                        <h4 className="text-[28px] font-mono font-black">{isIn ? fmtClock(elapsed) : '00:00:00'}</h4>
                                                        <p className="text-[13px] text-indigo-100 font-bold mt-1 uppercase tracking-widest">{isIn ? 'Engine Active' : 'Standby Mode'}</p>
                                                    </div>
                                                    <Zap size={40} className={`text-indigo-300 ${isIn ? 'animate-pulse' : 'opacity-20'}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-amber-50 rounded-[2rem] p-8 border border-amber-100 flex items-center gap-6">
                                            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-100">
                                                <AlertCircle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-[16px] font-black text-amber-900 uppercase tracking-tight">Shift Sync Required</h4>
                                                <p className="text-[13px] text-amber-700 font-medium mt-0.5">Your next shift begins in 14 hours. Ensure all tasks are logged.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {['Approvals', 'Leave'].includes(activeTab) && (
                                    <div className="py-40 flex flex-col items-center gap-6 text-center">
                                        <div className="p-8 bg-gray-50 rounded-full text-gray-200 border border-gray-100 animate-bounce">
                                            <Layers size={56} />
                                        </div>
                                        <div>
                                            <h4 className="text-[18px] font-black text-gray-900 uppercase tracking-tight">Synchronizing...</h4>
                                            <p className="text-[12px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pulling enterprise {activeTab} data from cloud.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Secondary stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                             {[
                                { label: 'Team Velocity', val: '94%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Compliance', val: '100%', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Collaboration', val: 'High', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                { label: 'Reports Gen', val: 'v2.4', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
                             ].map(s => (
                                 <div key={s.label} className="bg-white rounded-[1.75rem] border border-gray-100 p-5 shadow-sm group hover:-translate-y-1 transition-all">
                                     <div className="flex items-center justify-between mb-2">
                                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                                         <s.icon size={14} className={s.color} />
                                     </div>
                                     <p className={`text-[18px] font-black text-gray-900`}>{s.val}</p>
                                 </div>
                             ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;