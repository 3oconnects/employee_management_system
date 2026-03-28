import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, HelpCircle, ChevronDown, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
};

const Topbar: React.FC = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    const page = routeTitles[location.pathname] ?? { title: 'PrecisionHub', subtitle: '' };

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

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
            <div className="flex items-center gap-2">
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
                            onBlur={() => setSearchOpen(false)}
                        />
                    )}
                </div>

                {/* Help */}
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <HelpCircle size={16} />
                </button>

                {/* Notifications */}
                <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                </button>

                {/* Divider */}
                <div className="w-px h-5 bg-gray-100 mx-1"></div>

                {/* User chip */}
                <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow">
                        {user?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-[12px] font-semibold text-gray-800 leading-tight">{user?.name}</p>
                        <p className="text-[10px] text-gray-400 capitalize leading-tight">{user?.role}</p>
                    </div>
                    <ChevronDown size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block" />
                </button>
            </div>
        </header>
    );
};

export default Topbar;
