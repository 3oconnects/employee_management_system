import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Bell, Settings, HelpCircle, ChevronDown, Rocket, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Topbar: React.FC = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex flex-col flex-shrink-0 z-40 bg-white shadow-sm border-b border-slate-200">
            {/* Primary Global Nav */}
            <div className="h-[52px] bg-[#0F172A] flex items-center justify-between px-6 text-white text-[13px]">
                <div className="flex items-center space-x-10 h-full">
                    <div className="flex items-center space-x-2 mr-6">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-500/20">
                            <Rocket size={16} />
                        </div>
                        <span className="text-base font-black tracking-tight flex items-center">
                            PrecisionHub
                        </span>
                    </div>
                    <div className="flex items-center space-x-8 h-full">
                        <button className="h-full border-b-2 border-blue-500 text-white font-bold transition-all px-1 tracking-tight">My Space</button>
                        <button className="h-full border-b-2 border-transparent text-slate-400 hover:text-white transition-all px-1 tracking-tight">Organization</button>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <div className="hidden lg:flex items-center bg-slate-800/50 rounded-xl px-4 py-1.5 text-slate-400 border border-slate-700/50 group hover:border-slate-600 transition-all">
                        <Search size={14} className="mr-3 group-hover:text-white transition-colors" />
                        <span className="text-[12px] opacity-60">Search modules...</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button className="bg-blue-600 p-2 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95">
                            <Plus size={18} />
                        </button>
                        <div className="relative cursor-pointer group">
                            <Bell size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0F172A]"></span>
                        </div>
                        <div className="h-5 w-px bg-slate-800"></div>
                        <div className="flex items-center space-x-3 cursor-pointer group">
                            <div className="flex flex-col items-end mr-1">
                                <span className="text-white text-[11px] font-black tracking-tight leading-none mb-1">{user?.name}</span>
                                <span className="text-slate-500 text-[9px] uppercase font-bold tracking-widest leading-none">{user?.role}</span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-black border border-slate-700 group-hover:border-blue-500 transition-colors">
                                {user?.name?.charAt(0)}
                            </div>
                        </div>
                        <div className="h-5 w-px bg-slate-800"></div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            title="Sign Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sub-Nav Module Tabs */}
            <div className="h-[44px] bg-white flex items-center px-6 justify-between border-b border-slate-100">
                <div className="flex items-center space-x-8 h-full text-[13px]">
                    {['Overview', 'Dashboard', 'Calendar', 'Delegation'].map((tab, idx) => (
                        <button
                            key={tab}
                            className={`h-full px-1 border-b-2 transition-all font-bold tracking-tight ${idx === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="mr-2">Global Operations Center</span>
                    <ChevronDown size={14} className="text-slate-400" />
                </div>
            </div>
        </div>
    );
};

export default Topbar;
