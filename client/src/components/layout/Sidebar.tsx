import {
    BarChart3,
    UserPlus,
    Users,
    Clock,
    CalendarDays,
    CreditCard,
    FileText,
    Settings,
    LayoutGrid,
    Home,
    Briefcase,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../store/authStore';

const Sidebar: React.FC = () => {
    const [collapsed, setCollapsed] = useState(true);
    
    // Safely retrieve user from persistent storage
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    if (!user) {
        window.location.href = '/login';
        return null;
    }

    const userName = user?.name || user?.email || 'User';
    const initial = userName.charAt(0).toUpperCase();

    const menuItems = [
        { icon: Home, label: 'Home', path: '/dashboard', roles: ['admin', 'hr', 'manager'] },
        { icon: UserPlus, label: 'Onboarding', path: '/onboarding', roles: ['admin', 'hr'] },
        { icon: CalendarDays, label: 'Time Off', path: '/leave', roles: ['admin', 'hr', 'manager'] },
        { icon: Clock, label: 'Attendance', path: '/attendance', roles: ['admin', 'hr', 'manager'] },
        { icon: Briefcase, label: 'Timesheet', path: '/timesheet', roles: ['admin', 'hr', 'manager'] },
        { icon: CreditCard, label: 'Payroll', path: '/payroll', roles: ['admin', 'hr', 'employee'] },
        { icon: FileText, label: 'Reports', path: '/reports', roles: ['admin', 'hr'] },
    ];

    const filteredItems = menuItems.filter(item =>
        user && item.roles.includes(user.role as UserRole)
    );

    return (
        <aside
            className={`bg-[#0F172A] flex flex-col items-center py-6 flex-shrink-0 z-50 transition-all duration-300 border-r border-slate-800 shadow-xl ${collapsed ? 'w-[72px]' : 'w-[220px]'}`}
        >
            {/* Logo Section */}
            <div className="flex items-center justify-center w-full px-4 mb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 transform group-hover:rotate-6 transition-transform">
                        <LayoutGrid size={22} strokeWidth={2.5} />
                    </div>
                    {!collapsed && (
                        <span className="text-white font-black text-lg tracking-tight">PrecisionHub</span>
                    )}
                </div>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 flex flex-col items-center space-y-2 w-full px-3">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            w-full flex items-center py-3 rounded-xl transition-all relative group
                            ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                            ${collapsed ? 'justify-center px-1' : 'px-4 space-x-4'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {!collapsed && (
                                    <span className="text-[13px] font-bold tracking-tight whitespace-nowrap overflow-hidden">
                                        {item.label}
                                    </span>
                                )}

                                {collapsed && (
                                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-xl border border-slate-800 whitespace-nowrap z-[100] translate-x-[-10px] group-hover:translate-x-0">
                                        {item.label}
                                    </div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto flex flex-col items-center space-y-4 w-full px-3 pb-4">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all"
                >
                    {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center space-x-2 text-[12px] font-bold uppercase tracking-wider"><ChevronLeft size={18} /><span>Collapse</span></div>}
                </button>

                <div className="w-full h-px bg-slate-800/50 my-2"></div>

                <div className={`flex items-center w-full ${collapsed ? 'justify-center' : 'px-4 space-x-3'}`}>
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[11px] font-black text-white border border-slate-700 shadow-sm">
                        {initial}
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-white text-xs font-bold truncate">{userName}</span>
                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{user?.role}</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
