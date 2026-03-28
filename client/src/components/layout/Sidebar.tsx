import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    UserPlus,
    Users,
    Clock,
    Calendar,
    FileText,
    CreditCard,
    ClipboardList,
    ChevronLeft,
    ChevronRight,
    LogOut,
    BarChart2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
    roles: string[];
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard',  path: '/dashboard',  roles: ['admin', 'hr', 'manager'] },
    { icon: UserPlus,        label: 'Onboarding', path: '/onboarding', roles: ['admin', 'hr'] },
    { icon: Users,           label: 'Employees',  path: '/employees',  roles: ['admin', 'hr', 'manager'] },
    { icon: Clock,           label: 'Attendance', path: '/attendance', roles: ['admin', 'hr', 'manager', 'employee'] },
    { icon: Calendar,        label: 'Leave',      path: '/leave',      roles: ['admin', 'hr', 'manager', 'employee'] },
    { icon: ClipboardList,   label: 'Timesheet',  path: '/timesheet',  roles: ['admin', 'hr', 'manager', 'employee'] },
    { icon: CreditCard,      label: 'Payroll',    path: '/payroll',    roles: ['admin', 'hr', 'employee'] },
    { icon: BarChart2,       label: 'Reports',    path: '/reports',    roles: ['admin', 'hr'] },
];

const Sidebar: React.FC = () => {
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();

    const filteredMenu = menuItems.filter(item =>
        item.roles.includes(user?.role ?? '')
    );

    const initials = user?.name
        ? user.name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
                flex flex-col h-screen flex-shrink-0 overflow-hidden
                bg-[#1E2535] text-white
                transition-[width] duration-300 ease-in-out
                ${collapsed ? 'w-[64px]' : 'w-[220px]'}
            `}
        >
            {/* Logo + Brand */}
            <div className={`flex items-center h-[56px] px-4 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && (
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </div>
                        <span className="text-[15px] font-bold tracking-tight whitespace-nowrap text-white">PrecisionHub</span>
                    </div>
                )}
                {collapsed && (
                    <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-600/30">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                        </svg>
                    </div>
                )}
                {!collapsed && (
                    <button
                        onClick={() => setCollapsed(true)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Collapse sidebar"
                    >
                        <ChevronLeft size={16} />
                    </button>
                )}
            </div>

            {/* Expand button when collapsed */}
            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    className="mx-auto mt-3 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    title="Expand sidebar"
                >
                    <ChevronRight size={16} />
                </button>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-3 px-2 space-y-0.5">
                {filteredMenu.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                            `flex items-center rounded-lg transition-all duration-150 group
                            ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                            ${isActive
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-white/50 hover:text-white hover:bg-white/[0.07]'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={17} className={`flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-white/40 group-hover:text-white/80'} transition-colors`} />
                                {!collapsed && (
                                    <span className={`text-[13px] font-medium whitespace-nowrap ${isActive ? 'text-blue-300 font-semibold' : ''}`}>
                                        {item.label}
                                    </span>
                                )}
                                {!collapsed && isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User Footer */}
            <div className={`flex-shrink-0 border-t border-white/[0.06] p-3 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
                {!collapsed ? (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-white truncate leading-tight">{user?.name}</p>
                            <p className="text-[10px] text-white/40 capitalize leading-tight mt-0.5">{user?.role}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-white/10 transition-colors flex-shrink-0"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                ) : (
                    <>
                        <div
                            className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white shadow"
                            title={user?.name}
                        >
                            {initials}
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="p-1.5 rounded-lg text-white/30 hover:text-rose-400 hover:bg-white/10 transition-colors"
                        >
                            <LogOut size={14} />
                        </button>
                    </>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
