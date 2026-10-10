import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, UserPlus, Users, Clock, CalendarDays,
    CreditCard, ClipboardList, BarChart2, Shield,
    Settings, Layers, ChevronLeft, ChevronRight, ChevronDown,
    PlusCircle, History, ListFilter, CheckCircle2, User
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { OzofiMark } from '../brand';
import { BRAND } from '../../config/brand';
import { useWorkspace } from '../../hooks/useWorkspace';

interface SubMenuItem {
    label: string;
    path: string;
    roles?: string[];
    permissions?: string[];
    icon?: React.ElementType;
}

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path?: string;
    roles?: string[];
    permissions?: string[];
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
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', module: 'dashboard' },
            { icon: User,            label: 'My Profile', path: '/profile',   module: 'profile' },
            { icon: CheckCircle2,    label: 'Approvals',  path: '/approvals', permissions: ['approvals:read', 'approvals:manage', 'leave:approve', 'timesheet:approve', 'claims:approve'], module: 'approvals' },
        ]
    },
    {
        title: 'Workforce',
        items: [
            { icon: Users,           label: 'Employees',  path: '/employees',  permissions: ['employees:read', 'employees:manage', 'employee.view'], module: 'employees' },
            { icon: UserPlus,        label: 'Onboarding', path: '/onboarding', permissions: ['onboarding:manage'], module: 'onboarding' },
        ]
    },
    {
        title: 'Organization',
        items: [
            { icon: Layers,          label: 'Hierarchy',  path: '/organization', permissions: ['organization:read', 'organization:manage', 'governance:read'], module: 'organization' },
        ]
    },
    {
        title: 'Operations',
        items: [
            { icon: Clock,           label: 'Attendance', path: '/attendance', permissions: ['attendance:read', 'attendance:manage'], module: 'attendance' },
            { icon: CalendarDays,    label: 'Time Off',   path: '/leave',      permissions: ['leave:apply', 'leave:approve', 'leave:manage'], module: 'leave' },
            { icon: ClipboardList,   label: 'Timesheets', path: '/timesheet',  permissions: ['timesheet:submit', 'timesheet:approve'], module: 'timesheet' },
        ]
    },
    {
        title: 'Finance & Systems',
        items: [
            { icon: CreditCard,      label: 'Payroll',    path: '/payroll',    permissions: ['payroll:read', 'payroll:manage', 'payroll.process'], module: 'payroll' },
            { icon: BarChart2,       label: 'Reports',    path: '/reports',    permissions: ['reports:view', 'reports.view'], module: 'reports' },
            { icon: History,         label: 'Audit Log',  path: '/audit-logs', permissions: ['audit:read', 'audit.view'], module: 'audit' },
        ]
    },
    {
        title: 'Administration',
        items: [
            { icon: Settings,        label: 'Settings',   path: '/settings',   module: 'settings' },
        ]
    }
];

const Sidebar: React.FC = () => {
    const { user, hasModule, hasAnyRole, hasAnyPermission } = useAuthStore();
    const workspace = useWorkspace();
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

    const isAuthorized = (item: { roles?: string[]; permissions?: string[]; module?: string }) => {
        // 1. Dynamic permission checking (highest priority)
        if (item.permissions && item.permissions.length > 0) {
            return hasAnyPermission(...item.permissions);
        }

        // 2. Core self-service employee modules are always available to all authenticated employees
        const coreModules = ['dashboard', 'profile', 'settings'];
        if (item.module && coreModules.includes(item.module)) return true;

        // 3. Fallback to module or role check if specified
        if (item.module) return hasModule(item.module);
        if (item.roles && item.roles.length > 0) return hasAnyRole(...(item.roles as any));
        return true;
    };

    return (
        <aside
            className={`
                flex flex-col h-screen flex-shrink-0 z-40 select-none
                border-r border-slate-800/60
                transition-all duration-200 ease-in-out
                ${collapsed ? 'w-[58px] min-w-[58px]' : 'w-[218px] min-w-[218px]'}
            `}
            style={{
                background: '#0C1427',
                boxShadow: '1px 0 10px rgba(0,0,0,0.15)',
            }}
        >
            {/* ── Ozofi Brand Header (Compact 54px) ───── */}
            <div className={`h-[54px] flex items-center flex-shrink-0 border-b border-white/[0.08] relative
                ${collapsed ? 'justify-center px-1.5' : 'px-3'}`}>
                {collapsed ? (
                    <button
                        onClick={() => setCollapsed(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-white/[0.08] transition-all"
                        title="Expand navigation"
                    >
                        <OzofiMark size={22} />
                    </button>
                ) : (
                    <>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <OzofiMark size={24} />
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-bold text-white tracking-tight lowercase">ozofi</span>
                                    <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded bg-[#2563EB]/25 text-[#60A5FA] border border-[#2563EB]/30">NEXUS</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-medium tracking-wide truncate" title={workspace.name ?? BRAND.tagline}>
                                    {workspace.name ?? 'People & Operations'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                            title="Collapse navigation"
                        >
                            <ChevronLeft size={13} />
                        </button>
                    </>
                )}
            </div>

            {/* ── Navigation (Compact & Sleek) ────────── */}
            <nav className="flex-1 overflow-y-auto no-scrollbar px-2 py-2.5 space-y-3">
                {sidebarSections.filter(s => s.title !== 'Administration').map(section => {
                    const visibleItems = section.items.filter(isAuthorized);
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.title} className="space-y-0.5">
                            {!collapsed && (
                                <p className="px-2 text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                    {section.title}
                                </p>
                            )}
                            {collapsed && <div className="w-5 h-px bg-white/[0.06] mx-auto my-1.5" />}
                            {visibleItems.map(item => {
                                const isActive = item.path ? location.pathname === item.path || location.pathname.startsWith(item.path + '/') : false;
                                return (
                                    <div key={item.label}>
                                        {item.children ? (
                                             <>
                                                 <button
                                                     onClick={() => toggleSubMenu(item.label)}
                                                     className={`
                                                         w-full flex items-center rounded-lg transition-all duration-150 group
                                                         ${collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'}
                                                         ${openSubMenus[item.label]
                                                             ? 'text-white bg-white/[0.06]'
                                                             : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'}
                                                     `}
                                                 >
                                                     <item.icon size={14} className="flex-shrink-0" />
                                                     {!collapsed && (
                                                         <>
                                                             <span className="text-[12px] font-medium flex-1 text-left tracking-tight">{item.label}</span>
                                                             <ChevronDown size={11} className={`opacity-50 transition-transform duration-200 ${openSubMenus[item.label] ? 'rotate-180' : ''}`} />
                                                         </>
                                                     )}
                                                 </button>
                                                 {openSubMenus[item.label] && !collapsed && (
                                                     <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/[0.08] pl-2">
                                                         {item.children.filter(isAuthorized).map(sub => (
                                                             <NavLink
                                                                 key={sub.path}
                                                                 to={sub.path}
                                                                 className={({ isActive }) => `
                                                                     flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all
                                                                     ${isActive ? 'text-[#60A5FA] font-bold bg-[#1064EA]/15' : 'text-slate-400 hover:text-white'}
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
                                                    relative flex items-center rounded-lg transition-all duration-150 group
                                                    ${collapsed ? 'justify-center p-1.5' : 'gap-2 px-2.5 py-1.5'}
                                                    ${isActive
                                                        ? 'bg-[#1064EA] text-white shadow-xs font-semibold'
                                                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-white font-medium'}
                                                `}
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <item.icon size={14} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                                                        {!collapsed && (
                                                            <span className="text-[12px] tracking-tight whitespace-nowrap flex-1">
                                                                {item.label}
                                                            </span>
                                                        )}
                                                        {/* Tooltip when collapsed */}
                                                        {collapsed && (
                                                            <span className="pointer-events-none absolute left-[54px] z-50 bg-[#0C1427] text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap border border-white/10 shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
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
            <div className="px-2 py-2 border-t border-white/[0.08] mt-auto">
                {sidebarSections.find(s => s.title === 'Administration')?.items.filter(isAuthorized).map(item => (
                    <NavLink
                        key={item.label}
                        to={item.path!}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) => `
                            relative flex items-center rounded-lg transition-all duration-150 group
                            ${collapsed ? 'justify-center p-1.5' : 'gap-2 px-2.5 py-1.5'}
                            ${isActive
                                ? 'bg-[#1064EA] text-white shadow-xs font-semibold'
                                : 'text-slate-400 hover:bg-white/[0.05] hover:text-white font-medium'}
                        `}
                    >
                        <item.icon size={14} className="flex-shrink-0" />
                        {!collapsed && (
                            <span className="text-[12px] font-medium tracking-tight whitespace-nowrap">
                                {item.label}
                            </span>
                        )}
                        {collapsed && (
                            <span className="pointer-events-none absolute left-[54px] z-50 bg-[#0C1427] text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap border border-white/10 shadow-lg opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150">
                                {item.label}
                            </span>
                        )}
                    </NavLink>
                ))}

                {/* User chip at bottom */}
                {!collapsed && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center gap-2 px-1">
                        <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 bg-[#1064EA]"
                        >
                            {user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-white/80 truncate leading-none">{user?.name?.split(' ')[0]}</p>
                            <p className="text-[9px] text-slate-400 capitalize mt-0.5 truncate">{user?.role?.replace('_', ' ')}</p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
