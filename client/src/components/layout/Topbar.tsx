import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Bell, ChevronDown, LogOut, User, Shield, Search,
    Settings, HelpCircle, Building2, UserCircle2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const routeLabels: Record<string, string> = {
    '/dashboard':  'Dashboard',
    '/onboarding': 'Onboarding',
    '/employees':  'Employees',
    '/attendance': 'Attendance',
    '/leave':      'Leave Management',
    '/timesheet':  'Timesheets',
    '/payroll':    'Payroll',
    '/reports':    'Reports & Analytics',
    '/profile':    'My Profile',
    '/audit-logs': 'Audit Logs',
    '/organization': 'Hierarchy',
};

/* Avatar color map — same as Sidebar for consistency */
const AVATAR_COLORS: Record<string, string> = {
    A: '#6366f1', B: '#8b5cf6', C: '#ec4899', D: '#f59e0b', E: '#10b981',
    F: '#3b82f6', G: '#ef4444', H: '#14b8a6', I: '#f97316', J: '#84cc16',
    K: '#06b6d4', L: '#a855f7', M: '#e11d48', N: '#0ea5e9', O: '#22c55e',
    P: '#d946ef', Q: '#fb923c', R: '#64748b', S: '#6366f1', T: '#8b5cf6',
    U: '#ec4899', V: '#10b981', W: '#3b82f6', X: '#f59e0b', Y: '#14b8a6', Z: '#ef4444',
};
const getAvatarColor = (name?: string) => AVATAR_COLORS[(name?.[0] ?? 'U').toUpperCase()] ?? '#6366f1';

const Topbar: React.FC = () => {
    const { user, logout, accessToken } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const [userMenuOpen, setUserMenuOpen]     = useState(false);
    const [notifOpen, setNotifOpen]           = useState(false);
    const [notifications, setNotifications]   = useState<any[]>([]);
    const [unreadCount, setUnreadCount]       = useState(0);
    const [searchOpen, setSearchOpen]         = useState(false);
    const [searchQuery, setSearchQuery]       = useState('');

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef    = useRef<HTMLDivElement>(null);
    const searchRef   = useRef<HTMLDivElement>(null);
    const searchInput = useRef<HTMLInputElement>(null);

    const pageLabel = routeLabels[location.pathname] ?? 'Workspace';

    // Quick-search routes
    const allRoutes = [
        { label: 'Dashboard',     path: '/dashboard',  icon: '⊞' },
        { label: 'Employees',     path: '/employees',  icon: '👥' },
        { label: 'Attendance',    path: '/attendance', icon: '🕐' },
        { label: 'Leave',         path: '/leave',      icon: '📅' },
        { label: 'Timesheet',     path: '/timesheet',  icon: '📋' },
        { label: 'Payroll',       path: '/payroll',    icon: '💳' },
        { label: 'Reports',       path: '/reports',    icon: '📊' },
        { label: 'My Profile',    path: '/profile',    icon: '👤' },
    ];

    const filteredRoutes = searchQuery
        ? allRoutes.filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase()))
        : allRoutes.slice(0, 6);

    useEffect(() => {
        if (!accessToken) return;   // don't fetch until authenticated
        const fetchNotifs = () => {
            api.get('/notifications?limit=8')
                .then(res => {
                    setNotifications(res.data.data || []);
                    setUnreadCount(res.data.unreadCount || 0);
                })
                .catch(() => {});  // silently swallow — table may be pending migration
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000);
        return () => clearInterval(interval);
    }, [accessToken]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Keyboard shortcut ⌘K / Ctrl+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(true);
                setTimeout(() => searchInput.current?.focus(), 50);
            }
            if (e.key === 'Escape') setSearchOpen(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch {}
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const initials = user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'SA';
    const avatarColor = getAvatarColor(user?.name);

    const [searchParams, setSearchParams] = useSearchParams();
    const isDashboard = location.pathname === '/dashboard';
    const activeView  = (searchParams.get('view') ?? 'myspace') as 'myspace' | 'org';
    const setView = (v: 'myspace' | 'org') => setSearchParams(v === 'myspace' ? {} : { view: 'org' });

    return (
        <header className="h-[64px] flex-shrink-0 flex items-center bg-white border-b border-slate-100 sticky top-0 z-30 px-6 gap-4">

            {/* ── LEFT: Workspace Switcher (dashboard) OR Page Label ── */}
            <div className="w-[240px] flex-shrink-0 flex items-center">
                {isDashboard ? (
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        {([{id:'myspace',label:'My Space',Icon:UserCircle2},{id:'org',label:'Org',Icon:Building2}] as const).map(t=>(
                            <button key={t.id} onClick={()=>setView(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                                    activeView===t.id
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}>
                                <t.Icon size={13}/>{t.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-[13px] font-semibold text-slate-400 leading-none">{pageLabel}</p>
                )}
            </div>

            {/* ── CENTER: Search Bar ───────────────────────────────── */}
            <div className="flex-1 flex justify-center" ref={searchRef}>
                <div className="relative w-full max-w-[520px]">
                    <button
                        onClick={() => { setSearchOpen(true); setTimeout(() => searchInput.current?.focus(), 50); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200
                            ${searchOpen
                                ? 'bg-white border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                            }`}
                    >
                        <Search size={15} className="text-slate-400 flex-shrink-0" />
                        {searchOpen ? (
                            <input
                                ref={searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search pages, employees, actions..."
                                className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span className="flex-1 text-[13px] text-slate-400 text-left">Search anything...</span>
                        )}
                        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">⌘</kbd>
                            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">K</kbd>
                        </div>
                    </button>

                    {/* Search Dropdown */}
                    {searchOpen && (
                        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
                            <div className="px-4 py-3 border-b border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {searchQuery ? `Results for "${searchQuery}"` : 'Quick Navigate'}
                                </p>
                            </div>
                            <div className="py-2 max-h-64 overflow-y-auto">
                                {filteredRoutes.map(route => (
                                    <button
                                        key={route.path}
                                        onClick={() => { navigate(route.path); setSearchOpen(false); setSearchQuery(''); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left group"
                                    >
                                        <span className="text-lg w-6 text-center">{route.icon}</span>
                                        <span className="text-[13px] font-medium text-slate-700 group-hover:text-indigo-600">{route.label}</span>
                                    </button>
                                ))}
                                {filteredRoutes.length === 0 && (
                                    <div className="py-8 text-center text-[12px] text-slate-400">No results found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Actions ───────────────────────────────────── */}
            <div className="w-[180px] flex-shrink-0 flex items-center justify-end gap-2">

                {/* Help */}
                <button className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                    <HelpCircle size={18} />
                </button>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setNotifOpen(!notifOpen)}
                        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[13px] font-bold text-slate-900">Notifications</h4>
                                    {unreadCount > 0 && <p className="text-[11px] text-indigo-500 font-medium">{unreadCount} unread</p>}
                                </div>
                                <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700">
                                    Mark all read
                                </button>
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map((n: any) => (
                                    <div key={n.id} className={`px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer border-l-2 ${!n.is_read ? 'border-indigo-500 bg-indigo-50/30' : 'border-transparent'}`}>
                                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{n.title}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1.5">
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center">
                                        <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                                        <p className="text-[12px] text-slate-400">No notifications yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-all"
                    >
                        {/* Colored avatar */}
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shadow flex-shrink-0"
                            style={{ backgroundColor: avatarColor }}
                        >
                            {initials}
                        </div>
                        {/* Name + Role */}
                        <div className="hidden md:block text-left">
                            <p className="text-[12px] font-bold text-slate-800 leading-none">{user?.name?.split(' ')[0]}</p>
                            <p className="text-[9px] font-semibold capitalize mt-0.5" style={{ color: avatarColor }}>
                                {user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                        <ChevronDown size={13} className="text-slate-400" />
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] border border-slate-200 overflow-hidden z-50">
                            {/* Header with cover */}
                            <div className="relative">
                                <div className="h-10" style={{ background: `linear-gradient(135deg, ${avatarColor}50, ${avatarColor}25)` }} />
                                <div className="px-4 pb-3 -mt-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold text-white ring-2 ring-white shadow"
                                        style={{ backgroundColor: avatarColor }}
                                    >
                                        {initials}
                                    </div>
                                    <p className="text-[13px] font-bold text-slate-900 mt-1.5">{user?.name}</p>
                                    <p className="text-[11px] text-slate-400">{user?.email}</p>
                                </div>
                            </div>
                            <div className="p-2 border-t border-slate-100">
                                <button onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                    <User size={15} /> My Profile
                                </button>
                                <button className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                    <Settings size={15} /> Settings
                                </button>
                                {['admin', 'super_admin'].includes(user?.role || '') && (
                                    <button onClick={() => { navigate('/audit-logs'); setUserMenuOpen(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                        <Shield size={15} /> Audit Logs
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-slate-100 p-2">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                                    <LogOut size={15} /> Sign Out
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
