import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, HelpCircle, ChevronDown, X, LogOut, User, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

// ============================================================================
// TOPBAR — UPGRADED WITH LIVE NOTIFICATIONS + USER MENU
// ============================================================================

const routeTitles: Record<string, { title: string; subtitle: string }> = {
    '/dashboard':  { title: 'Dashboard',    subtitle: 'Overview of your workspace' },
    '/onboarding': { title: 'Onboarding',   subtitle: 'Manage new hire journeys' },
    '/employees':  { title: 'Employees',    subtitle: 'Manage your workforce' },
    '/attendance': { title: 'Attendance',   subtitle: 'Track daily presence' },
    '/leave':      { title: 'Leave',        subtitle: 'Requests and balances' },
    '/timesheet':  { title: 'Timesheet',    subtitle: 'Log and review hours' },
    '/payroll':    { title: 'Payroll',      subtitle: 'Salaries and compliance' },
    '/reports':    { title: 'Reports',      subtitle: 'Analytics and insights' },
    '/profile':    { title: 'My Profile',   subtitle: 'Account and settings' },
    '/audit-logs': { title: 'Audit Logs',   subtitle: 'System activity history' },
};

const Topbar: React.FC = () => {
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const [searchOpen, setSearchOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const searchRef = useRef<HTMLInputElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const page = routeTitles[location.pathname] ?? { title: 'PrecisionHub', subtitle: '' };

    // Fetch notifications
    useEffect(() => {
        const fetchNotifs = () => {
            api.get('/notifications?limit=8')
                .then(res => {
                    setNotifications(res.data.data || []);
                    setUnreadCount(res.data.unreadCount || 0);
                })
                .catch(() => {});
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {}
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'U';

    return (
        <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-6 bg-white border-b border-gray-100 z-30">
            {/* Page Title */}
            <div>
                <h1 className="text-[15px] font-semibold text-gray-900 leading-tight tracking-tight">{page.title}</h1>
                {page.subtitle && (
                    <p className="text-[11px] text-gray-400 font-medium leading-tight">{page.subtitle}</p>
                )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1.5">
                {/* Search */}
                <div className={`flex items-center gap-2 rounded-lg border transition-all duration-200 overflow-hidden ${searchOpen ? 'w-56 border-blue-300 bg-blue-50/50 px-3' : 'w-8 border-transparent'}`}>
                    <button
                        onClick={() => setSearchOpen(prev => !prev)}
                        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 py-1.5"
                    >
                        {searchOpen ? <X size={15} /> : <Search size={15} />}
                    </button>
                    {searchOpen && (
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search..."
                            className="flex-1 text-[13px] bg-transparent outline-none text-gray-700 placeholder-gray-400"
                            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                        />
                    )}
                </div>

                {/* Help */}
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <HelpCircle size={16} />
                </button>

                {/* Notifications Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-[11px] text-blue-600 font-semibold hover:text-blue-700">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map((n: any) => (
                                    <div
                                        key={n.id}
                                        className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                                        onClick={() => { if (n.link) navigate(n.link); setNotifOpen(false); }}
                                    >
                                        <div className="flex items-start gap-2">
                                            {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-semibold text-gray-800 leading-snug">{n.title}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                                                <p className="text-[10px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-sm text-gray-400">
                                        No notifications
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-gray-100 mx-1"></div>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow">
                            {initials}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-[12px] font-semibold text-gray-800 leading-tight">{user?.name}</p>
                            <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <ChevronDown size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block" />
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-gray-900">{user?.name}</p>
                                <p className="text-[11px] text-gray-400">{user?.email}</p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <User size={14} className="text-gray-400" /> My Profile
                                </button>
                                {user?.role === 'admin' && (
                                    <button
                                        onClick={() => { navigate('/audit-logs'); setUserMenuOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Shield size={14} className="text-gray-400" /> Audit Logs
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={14} /> Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
