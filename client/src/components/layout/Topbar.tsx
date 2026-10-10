import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Bell, ChevronDown, LogOut, User, Shield, Search,
    Settings, HelpCircle, Building2, UserCircle2, X, Command,
    Plus, Clock, CalendarDays, UserPlus, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { pagesFor, canSearchEmployees } from '../../utils/searchAccess';

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
    '/approvals':       'Approvals',
    '/settings':        'Settings',
    '/unauthorized':    'Access Control',
    '/change-password': 'Security Credentials',
};

/* Avatar color map — same as Sidebar for consistency */
const AVATAR_COLORS: Record<string, string> = {
    A: '#1064EA', B: '#2563EB', C: '#00A859', D: '#F59E0B', E: '#10B981',
    F: '#1064EA', G: '#ED1C24', H: '#14B8A6', I: '#F97316', J: '#84CC16',
    K: '#06B6D4', L: '#8B5CF6', M: '#E11D48', N: '#0EA5E9', O: '#22C55E',
    P: '#D946EF', Q: '#FB923C', R: '#64748B', S: '#1064EA', T: '#2563EB',
    U: '#00A859', V: '#10B981', W: '#1064EA', X: '#F59E0B', Y: '#14B8A6', Z: '#ED1C24',
};
const getAvatarColor = (name?: string) => AVATAR_COLORS[(name?.[0] ?? 'U').toUpperCase()] ?? '#1064EA';

const Topbar: React.FC = () => {
    const { user, logout, accessToken, hasAnyRole, hasPermission } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();

    const [userMenuOpen, setUserMenuOpen]     = useState(false);
    const [notifOpen, setNotifOpen]           = useState(false);
    const [quickAddOpen, setQuickAddOpen]     = useState(false);
    const [notifications, setNotifications]   = useState<any[]>([]);
    const [unreadCount, setUnreadCount]       = useState(0);
    const [searchOpen, setSearchOpen]         = useState(false);
    const [searchQuery, setSearchQuery]       = useState('');

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notifRef    = useRef<HTMLDivElement>(null);
    const quickAddRef = useRef<HTMLDivElement>(null);
    const searchRef   = useRef<HTMLDivElement>(null);
    const searchInput = useRef<HTMLInputElement>(null);

    const pageLabel = routeLabels[location.pathname] ?? 'Workspace';

    // Pages this role can open; employees too when the role may open the Employees page
    const filteredRoutes = pagesFor(hasAnyRole, searchQuery).slice(0, searchQuery ? 8 : 7);
    const canFindPeople = canSearchEmployees(hasAnyRole);
    const [people, setPeople] = useState<any[]>([]);
    const [peopleLoading, setPeopleLoading] = useState(false);

    useEffect(() => {
        const q = searchQuery.trim();
        if (!canFindPeople || q.length < 2) { setPeople([]); setPeopleLoading(false); return; }
        let stale = false;
        setPeopleLoading(true);
        const t = setTimeout(() => {
            api.get('/employees', { params: { search: q, limit: 5 } })
                .then(res => { if (!stale) setPeople(res.data?.items || []); })
                .catch(() => { if (!stale) setPeople([]); })
                .finally(() => { if (!stale) setPeopleLoading(false); });
        }, 250);
        return () => { stale = true; clearTimeout(t); };
    }, [searchQuery, canFindPeople]);

    useEffect(() => {
        if (!accessToken || !user?.id) return;
        let isMounted = true;
        const fetchNotifs = () => {
            api.get('/notifications?limit=8')
                .then(res => {
                    if (!isMounted) return;
                    setNotifications(res.data?.data || []);
                    setUnreadCount(res.data?.unreadCount ?? res.data?.meta?.unreadCount ?? 0);
                })
                .catch(() => {});
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 60000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [accessToken, user?.id]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setQuickAddOpen(false);
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
            if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
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
        <header className="h-[54px] flex-shrink-0 flex items-center bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 gap-3"
            style={{ boxShadow: '0 1px 0 0 rgba(15,23,42,0.04), 0 2px 8px rgba(15,23,42,0.03)' }}>

            {/* ── LEFT: Workspace Switcher (dashboard) OR Page Label ── */}
            <div className="w-[220px] flex-shrink-0 flex items-center">
                {isDashboard ? (
                    <div className="flex items-center gap-0.5 p-0.5 bg-slate-100/80 rounded-xl border border-slate-200/50">
                        {([
                            { id: 'myspace', label: 'My Space', Icon: UserCircle2 },
                            { id: 'org',     label: 'Org',      Icon: Building2   },
                        ] as const).map(t => (
                            <button key={t.id} onClick={() => setView(t.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                    activeView === t.id
                                        ? 'bg-white text-indigo-600 shadow-sm shadow-slate-200/80'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}>
                                <t.Icon size={12} />{t.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-4.5 bg-[#1064EA] rounded-full" />
                        <p className="text-[13px] font-bold text-slate-800 leading-none tracking-tight">{pageLabel}</p>
                    </div>
                )}
            </div>

            {/* ── CENTER: Search Bar ───────────────────────────────── */}
            <div className="flex-1 flex justify-center" ref={searchRef}>
                <div className="relative w-full max-w-[500px]">
                    <button
                        onClick={() => { setSearchOpen(true); setTimeout(() => searchInput.current?.focus(), 50); }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all duration-200
                            ${searchOpen
                                ? 'bg-white border-[#1064EA] shadow-[0_0_0_3px_rgba(16,100,234,0.12)]'
                                : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                            }`}
                    >
                        <Search size={14} className="text-slate-400 flex-shrink-0" />
                        {searchOpen ? (
                            <input
                                ref={searchInput}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={canFindPeople ? 'Search pages and employees...' : 'Search pages...'}
                                className="flex-1 bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span className="flex-1 text-[13px] text-slate-400 text-left">Search anything...</span>
                        )}
                        <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                            <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-sm">⌘</kbd>
                            <kbd className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-sm">K</kbd>
                        </div>
                    </button>

                    {/* Search Dropdown */}
                    {searchOpen && (
                        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.10)] border border-slate-200/80 overflow-hidden z-50">
                            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {searchQuery ? `Results for "${searchQuery}"` : 'Quick Navigate'}
                                </p>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-slate-300 hover:text-slate-500 transition-colors">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <div className="py-1.5 max-h-80 overflow-y-auto">
                                {filteredRoutes.map(route => (
                                    <button
                                        key={route.path}
                                        onClick={() => { navigate(route.path); setSearchOpen(false); setSearchQuery(''); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/70 transition-colors text-left group"
                                    >
                                        <span className="text-base w-5 text-center leading-none flex-shrink-0">{route.icon}</span>
                                        <span className="text-[13px] font-medium text-slate-600 group-hover:text-indigo-700 transition-colors">{route.label}</span>
                                        <span className="ml-auto text-[10px] text-slate-300 group-hover:text-indigo-300 font-mono transition-colors opacity-0 group-hover:opacity-100">↵</span>
                                    </button>
                                ))}
                                {canFindPeople && searchQuery.trim().length >= 2 && (
                                    <>
                                        <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employees</p>
                                        {people.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => { navigate(`/profile/${p.id}`); setSearchOpen(false); setSearchQuery(''); }}
                                                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-indigo-50/70 transition-colors text-left group"
                                            >
                                                {p.avatar_url
                                                    ? <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                                                    : <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ backgroundColor: getAvatarColor(p.name) }}>{(p.name?.[0] ?? '?').toUpperCase()}</span>}
                                                <span className="min-w-0">
                                                    <span className="block text-[13px] font-medium text-slate-700 truncate">{p.name}</span>
                                                    <span className="block text-[11px] text-slate-400 truncate">{[p.position, p.department_name || p.department, p.id].filter(Boolean).join(' · ')}</span>
                                                </span>
                                            </button>
                                        ))}
                                        {!peopleLoading && people.length === 0 && (
                                            <div className="px-4 py-2 text-[12px] text-slate-400">No employees match</div>
                                        )}
                                        {peopleLoading && <div className="px-4 py-2 text-[12px] text-slate-400">Searching…</div>}
                                    </>
                                )}
                                {filteredRoutes.length === 0 && !(canFindPeople && searchQuery.trim().length >= 2) && (
                                    <div className="py-8 text-center text-[12px] text-slate-400">No results found</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── RIGHT: Actions ───────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-2">

                {/* Zoho Signature + Quick Add Button */}
                <div className="relative" ref={quickAddRef}>
                    <button
                        onClick={() => { setQuickAddOpen(!quickAddOpen); setNotifOpen(false); setUserMenuOpen(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1064EA] hover:bg-[#0C54C8] text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-[#1064EA]/25"
                        title="Quick Add Actions"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span className="hidden sm:inline">Quick Add</span>
                    </button>

                    {quickAddOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] border border-slate-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoho Quick Actions</p>
                            </div>
                            <div className="p-1.5 space-y-0.5 text-xs">
                                <button
                                    onClick={() => { navigate('/timesheet'); setQuickAddOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-[#1064EA] hover:bg-blue-50/60 font-semibold transition-colors text-left"
                                >
                                    <Clock size={15} className="text-[#1064EA]" />
                                    <span>Log Timesheet</span>
                                </button>
                                <button
                                    onClick={() => { navigate('/leave'); setQuickAddOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-[#00A859] hover:bg-emerald-50/60 font-semibold transition-colors text-left"
                                >
                                    <CalendarDays size={15} className="text-[#00A859]" />
                                    <span>Apply for Leave</span>
                                </button>
                                <button
                                    onClick={() => { navigate('/attendance'); setQuickAddOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-[#F59E0B] hover:bg-amber-50/60 font-semibold transition-colors text-left"
                                >
                                    <Clock size={15} className="text-[#F59E0B]" />
                                    <span>Punch Attendance</span>
                                </button>
                                {hasPermission('onboarding:manage') && (
                                    <button
                                        onClick={() => { navigate('/onboarding'); setQuickAddOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-purple-600 hover:bg-purple-50/60 font-semibold transition-colors text-left"
                                    >
                                        <UserPlus size={15} className="text-purple-600" />
                                        <span>Onboard Employee</span>
                                    </button>
                                )}
                                {hasPermission('approvals:read') && (
                                    <button
                                        onClick={() => { navigate('/approvals'); setQuickAddOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 font-semibold transition-colors text-left"
                                    >
                                        <CheckCircle2 size={15} className="text-indigo-600" />
                                        <span>Review Approvals</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Help */}
                <button 
                    onClick={() => window.open('https://help.zoho.com', '_blank')}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#1064EA] hover:bg-blue-50/70 transition-all"
                    title="Documentation & Help"
                >
                    <HelpCircle size={16} />
                </button>

                {/* Notifications with Zoho Red Accent */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); setQuickAddOpen(false); }}
                        className="relative w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-[#1064EA] hover:bg-blue-50/70 transition-all"
                    >
                        <Bell size={16} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[15px] h-[15px] bg-[#ED1C24] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notifOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.10)] border border-slate-200/80 overflow-hidden z-50">
                            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h4 className="text-[13px] font-bold text-slate-900">Notifications</h4>
                                    {unreadCount > 0 && <p className="text-[11px] text-[#1064EA] font-medium mt-0.5">{unreadCount} unread</p>}
                                </div>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-[11px] font-semibold text-[#1064EA] hover:text-[#0C54C8] transition-colors">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.length > 0 ? notifications.map((n: any) => (
                                    <div key={n.id} className={`px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer border-l-2 ${!n.is_read ? 'border-indigo-500 bg-indigo-50/20' : 'border-transparent'}`}>
                                        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{n.title}</p>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{n.message}</p>
                                        <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )) : (
                                    <div className="py-12 text-center">
                                        <Bell size={22} className="text-slate-200 mx-auto mb-2" />
                                        <p className="text-[12px] text-slate-400">No notifications yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="w-px h-5 bg-slate-200 mx-0.5" />

                {/* Profile */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
                        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-slate-100/80 transition-all group"
                    >
                        {/* Avatar photo or colored initials */}
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user?.name || 'Profile'}
                                className="w-7 h-7 rounded-lg object-cover flex-shrink-0 shadow-sm ring-1 ring-slate-200"
                            />
                        ) : (
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: avatarColor }}
                            >
                                {initials}
                            </div>
                        )}
                        {/* Name + Role */}
                        <div className="hidden md:block text-left">
                            <p className="text-[12px] font-bold text-slate-700 leading-none">{user?.name?.split(' ')[0]}</p>
                            <p className="text-[9px] font-semibold capitalize mt-0.5" style={{ color: avatarColor }}>
                                {user?.dashboard_type || user?.role?.replace('_', ' ')}
                            </p>
                        </div>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.10)] border border-slate-200/80 overflow-hidden z-50">
                            {/* Header with cover */}
                            <div className="relative">
                                <div className="h-10" style={{ background: `linear-gradient(135deg, ${avatarColor}45, ${avatarColor}18)` }} />
                                <div className="px-4 pb-3 -mt-4">
                                    {user?.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user?.name || 'Profile'}
                                            className="w-9 h-9 rounded-xl object-cover ring-2 ring-white shadow-sm"
                                        />
                                    ) : (
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black text-white ring-2 ring-white shadow-sm"
                                            style={{ backgroundColor: avatarColor }}
                                        >
                                            {initials}
                                        </div>
                                    )}
                                    <p className="text-[13px] font-bold text-slate-900 mt-2 leading-tight">{user?.name}</p>
                                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                                </div>
                            </div>
                            <div className="p-1.5 border-t border-slate-100">
                                <button onClick={() => { navigate('/profile'); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                    <User size={14} /> My Profile
                                </button>
                                <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                    <Settings size={14} /> Settings & Preferences
                                </button>
                                {hasPermission('audit:read') && (
                                    <button onClick={() => { navigate('/audit-logs'); setUserMenuOpen(false); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all">
                                        <Shield size={14} /> Audit Logs
                                    </button>
                                )}
                            </div>
                            <div className="border-t border-slate-100 p-1.5">
                                <button onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-medium">
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
