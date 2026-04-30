import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
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
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin','hr','manager','super_admin','employee'], module: 'dashboard' },
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
    const { user, hasModule } = useAuthStore();
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
        catch { return false; }
    });
    const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
    }, [collapsed]);

    const toggleSubMenu = (label: string) => {
        setOpenSubMenus(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const isAuthorized = (item: { roles: string[], module?: string }) => {
        const role = user?.role ?? '';
        if (!item.roles.includes(role)) return false;
        if (role === 'admin' || role === 'super_admin') return true;
        if (item.module) return hasModule(item.module);
        return true;
    };

    return (
        <aside
            className={`
                flex flex-col h-screen flex-shrink-0 z-40 select-none
                bg-[#0F172A] border-r border-indigo-500/10 shadow-[4px_0_24px_rgba(0,0,0,0.15)]
                transition-all duration-300 ease-in-out
                ${collapsed ? 'w-[72px] min-w-[72px]' : 'w-[256px] min-w-[256px]'}
            `}
        >
            {/* ── Logo + Collapse ─────────────────── */}
            <div className={`h-[64px] flex items-center flex-shrink-0 border-b border-white/[0.05] relative
                ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
                    >
                        <ChevronRight size={18} className="text-white" />
                    </button>
                ) : (
                    <>
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-600/30">
                            <Layers size={18} className="text-white" />
                        </div>
                        <div className="ml-3.5 flex-1 min-w-0">
                            <p className="text-[15px] font-black text-white leading-none tracking-tight">AURA</p>
                            <p className="text-[9px] font-bold text-indigo-400/60 uppercase tracking-[0.2em] mt-1">Personnel Hub</p>
                        </div>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* ── Navigation ────────────────────────── */}
            <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-6">
                {sidebarSections.filter(s => s.title !== 'Administration').map(section => {
                    const visibleItems = section.items.filter(isAuthorized);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title} className="space-y-1">
                            {!collapsed && (
                                <p className="px-3 text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-3">
                                    {section.title}
                                </p>
                            )}
                            {visibleItems.map(item => (
                                <div key={item.label}>
                                    {item.children ? (
                                        <>
                                            <button
                                                onClick={() => toggleSubMenu(item.label)}
                                                className={`
                                                    w-full flex items-center rounded-xl transition-all duration-150 group
                                                    ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                                                    ${openSubMenus[item.label] ? 'text-white/90 bg-white/[0.04]' : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'}
                                                `}
                                            >
                                                <item.icon size={18} className="flex-shrink-0" />
                                                {!collapsed && (
                                                    <>
                                                        <span className="text-[13px] font-semibold flex-1 text-left tracking-tight">{item.label}</span>
                                                        <ChevronDown size={14} className={`transition-transform duration-200 ${openSubMenus[item.label] ? 'rotate-180' : ''}`} />
                                                    </>
                                                )}
                                            </button>
                                            {openSubMenus[item.label] && !collapsed && (
                                                <div className="ml-9 mt-1 space-y-1 border-l border-white/[0.05]">
                                                    {item.children.filter(isAuthorized).map(sub => (
                                                        <NavLink
                                                            key={sub.path}
                                                            to={sub.path}
                                                            className={({ isActive }) => `
                                                                flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all
                                                                ${isActive ? 'text-indigo-400' : 'text-white/30 hover:text-white/70'}
                                                            `}
                                                        >
                                                            {sub.icon && <sub.icon size={12} />}
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
                                            className={({ isActive }) => `
                                                relative flex items-center rounded-xl transition-all duration-150 group
                                                ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                                                ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                    : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'}
                                            `}
                                        >
                                            <item.icon size={18} className="flex-shrink-0" />
                                            {!collapsed && (
                                                <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
                                                    {item.label}
                                                </span>
                                            )}
                                            {collapsed && (
                                                <span className="pointer-events-none absolute left-[60px] z-50 bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap border border-white/10 shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                                                    {item.label}
                                                </span>
                                            )}
                                        </NavLink>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </nav>

            {/* ── Settings (Pinned to bottom) ────────────────────────── */}
            <div className="px-3 py-4 border-t border-white/[0.05] mt-auto">
                {sidebarSections.find(s => s.title === 'Administration')?.items.filter(isAuthorized).map(item => (
                    <NavLink
                        key={item.label}
                        to={item.path!}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `
                            relative flex items-center rounded-xl transition-all duration-150 group
                            ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                            ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-white/40 hover:bg-white/[0.06] hover:text-white/80'}
                        `}
                    >
                        <item.icon size={18} className="flex-shrink-0" />
                        {!collapsed && (
                            <span className="text-[13px] font-semibold tracking-tight whitespace-nowrap">
                                {item.label}
                            </span>
                        )}
                        {collapsed && (
                            <span className="pointer-events-none absolute left-[60px] z-50 bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap border border-white/10 shadow-xl opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                                {item.label}
                            </span>
                        )}
                    </NavLink>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
