import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, UserPlus, Users, Clock, CalendarDays,
    CreditCard, ClipboardList, BarChart2, Shield,
    Settings, Layers, ChevronLeft, ChevronRight, ChevronDown,
    PlusCircle, History, ListFilter, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SubMenuItem {
    label: string;
    path: string;
    roles: string[];
    icon?: React.ElementType;
}

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path?: string;
    roles: string[];
    module?: string;
    children?: SubMenuItem[];
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

const sidebarSections: MenuSection[] = [
    {
        title: 'Overview',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: [], module: 'dashboard' },
            { icon: CheckCircle2, label: 'Approvals', path: '/approvals', roles: ['admin','hr','manager','super_admin'], module: 'approvals' },
        ]
    },
    {
        title: 'Workforce',
        items: [
            { icon: Users,           label: 'Employees',  path: '/employees',  roles: ['admin','hr','manager','super_admin'],            module: 'employees' },
            { icon: UserPlus,        label: 'Onboarding', path: '/onboarding', roles: ['admin','hr','super_admin'],                     module: 'onboarding' },
        ]
    },
    {
        title: 'Organization',
        items: [
            { icon: Layers,          label: 'Hierarchy',  path: '/organization', roles: ['admin','hr','super_admin'],           module: 'organization' },
        ]
    },
    {
        title: 'Operations',
        items: [
            { icon: Clock,           label: 'Attendance', path: '/attendance', roles: ['admin','hr','manager','employee','super_admin'], module: 'attendance' },
            { icon: CalendarDays,    label: 'Time Off',   path: '/leave',      roles: ['admin','hr','manager','employee','super_admin'], module: 'leave' },
            { icon: ClipboardList,   label: 'Timesheets', path: '/timesheet',  roles: ['admin','hr','manager','employee','super_admin'], module: 'timesheet' },
        ]
    },
    {
        title: 'Finance & Systems',
        items: [
            { icon: CreditCard,      label: 'Payroll',    path: '/payroll',    roles: ['admin','hr','employee','super_admin'],           module: 'payroll' },
            { icon: BarChart2,       label: 'Reports',    path: '/reports',    roles: ['admin','hr','super_admin'],                     module: 'reports' },
            { icon: History,         label: 'Audit Log',  path: '/audit-logs', roles: ['admin','super_admin'],                          module: 'audit' },
        ]
    },
    {
        title: 'Administration',
        items: [
            { icon: Settings,        label: 'Settings',   path: '/settings',   roles: ['admin','super_admin'],                          module: 'settings' },
        ]
    }
];

const Sidebar: React.FC = () => {
    const { user, hasModule, hasAnyRole } = useAuthStore();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
        catch { return false; }
    });
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
    }, [collapsed]);

    const toggleSubMenu = (label: string) => {
        setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const isAuthorized = (item: { roles: string[], module?: string }) => {
        if (item.roles.length === 0) return true;
        if (!hasAnyRole(...(item.roles as any))) return false;
        if (hasAnyRole('admin', 'super_admin')) return true;
        if (item.module) return hasModule(item.module);
        return true;
    };

    return (
        <aside
            className={`
                flex flex-col h-screen flex-shrink-0 z-40 select-none
                border-r border-white/[0.04]
                transition-all duration-300 ease-in-out
                ${collapsed ? 'w-[68px] min-w-[68px]' : 'w-[240px] min-w-[240px]'}
            `}
            style={{
                background: 'linear-gradient(180deg, #0D1117 0%, #0F172A 60%, #0D1117 100%)',
                boxShadow: '4px 0 32px rgba(0,0,0,0.25)',
            }}
        >
            {/* ── Logo + Collapse ─────────────────── */}
            <div className={`h-[64px] flex items-center flex-shrink-0 border-b border-white/[0.04] relative
                ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all hover:scale-105"
                    >
                        <ChevronRight size={16} className="text-white" />
                    </button>
                ) : (
                    <>
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30">
                            <Layers size={15} className="text-white" />
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                            <p className="text-[14px] font-black text-white leading-none tracking-tight">AURA</p>
                            <p className="text-[9px] font-bold text-indigo-400/50 uppercase tracking-[0.18em] mt-0.5">Personnel Hub</p>
                        </div>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-all"
                        >
                            <ChevronLeft size={15} />
                        </button>
                    </>
                )}
            </div>

            {/* ── Navigation ────────────────────────── */}
            <nav className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-4 space-y-5">
                {sidebarSections.filter(s => s.title !== 'Administration').map(section => {
                    const visibleItems = section.items.filter(isAuthorized);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title} className="space-y-0.5">
                            {!collapsed && (
                                <p className="px-2.5 text-[9px] font-black text-white/15 uppercase tracking-[0.28em] mb-2">
                                    {section.title}
                                </p>
                            )}
                            {collapsed && <div className="w-6 h-px bg-white/[0.06] mx-auto my-2" />}
                            {visibleItems.map(item => {
                                const isActive = item.path ? location.pathname === item.path || location.pathname.startsWith(item.path + '/') : false;
                                return (
                                    <div key={item.label}>
                                        {item.children ? (
                                            <>
                                                <button
                                                    onClick={() => toggleSubMenu(item.label)}
                                                    className={`
                                                        w-full flex items-center rounded-xl transition-all duration-150 group
                                                        ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'}
                                                        ${openSubMenus[item.label]
                                                            ? 'text-white/90 bg-white/[0.06]'
                                                            : 'text-white/35 hover:bg-white/[0.05] hover:text-white/75'}
                                                    `}
                                                >
                                                    <item.icon size={16} className="flex-shrink-0" />
                                                    {!collapsed && (
                                                        <>
                                                            <span className="text-[12px] font-semibold flex-1 text-left tracking-tight">{item.label}</span>
                                                            <ChevronDown size={12} className={`opacity-50 transition-transform duration-200 ${openSubMenus[item.label] ? 'rotate-180' : ''}`} />
                                                        </>
                                                    )}
                                                </button>
                                                {openSubMenus[item.label] && !collapsed && (
                                                    <div className="ml-8 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-2">
                                                        {item.children.filter(isAuthorized).map(sub => (
                                                            <NavLink
                                                                key={sub.path}
                                                                to={sub.path}
                                                                className={({ isActive }) => `
                                                                    flex items-center gap-2 px-2.5 py-2 text-[11px] font-semibold rounded-lg transition-all
                                                                    ${isActive ? 'text-indigo-400' : 'text-white/25 hover:text-white/65'}
                                                                `}
                                                            >
                                                                {sub.icon && <sub.icon size={11} />}
                                                                {sub.label}
                                                            </NavLink>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <NavLink
                                                to={item.path!}
                                                title={collapsed ? item.label : undefined}
                                                onMouseEnter={() => setHoveredItem(item.label)}
                                                onMouseLeave={() => setHoveredItem(null)}
                                                className={({ isActive }) => `
                                                    relative flex items-center rounded-xl transition-all duration-150 group
                                                    ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'}
                                                    ${isActive
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                                        : 'text-white/35 hover:bg-white/[0.06] hover:text-white/80'}
                                                `}
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        {/* Active left bar */}
                                                        {isActive && !collapsed && (
                                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/60 rounded-full -ml-2.5" />
                                                        )}
                                                        <item.icon size={16} className="flex-shrink-0" />
                                                        {!collapsed && (
                                                            <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap flex-1">
                                                                {item.label}
                                                            </span>
                                                        )}
                                                        {/* Tooltip when collapsed */}
                                                        {collapsed && (
                                                            <span className="pointer-events-none absolute left-[58px] z-50 bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap border border-white/10 shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                                                                {item.label}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </NavLink>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* ── Settings (Pinned to bottom) ────────────────────────── */}
            <div className="px-2.5 py-3 border-t border-white/[0.04] mt-auto">
                {sidebarSections.find(s => s.title === 'Administration')?.items.filter(isAuthorized).map(item => (
                    <NavLink
                        key={item.label}
                        to={item.path!}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `
                            relative flex items-center rounded-xl transition-all duration-150 group
                            ${collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-2.5 py-2'}
                            ${isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                                : 'text-white/35 hover:bg-white/[0.06] hover:text-white/80'}
                        `}
                    >
                        <item.icon size={16} className="flex-shrink-0" />
                        {!collapsed && (
                            <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">
                                {item.label}
                            </span>
                        )}
                        {collapsed && (
                            <span className="pointer-events-none absolute left-[58px] z-50 bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap border border-white/10 shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                                {item.label}
                            </span>
                        )}
                    </NavLink>
                ))}

                {/* User chip at bottom */}
                {!collapsed && (
                    <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-2.5 px-2.5">
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white flex-shrink-0"
                            style={{ backgroundColor: '#6366f1' }}
                        >
                            {user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white/70 truncate leading-none">{user?.name?.split(' ')[0]}</p>
                            <p className="text-[9px] text-white/25 capitalize mt-0.5 truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
