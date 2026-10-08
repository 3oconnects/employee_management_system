import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
    ShieldAlert, 
    ArrowLeft, 
    LayoutDashboard, 
    User, 
    Settings, 
    Lock,
    HelpCircle,
    ChevronRight,
    Shield
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

export const UnauthorizedPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();

    // Destination user attempted to access
    const state = location.state as { from?: { pathname?: string }; requiredPermissions?: string[]; allowedRoles?: string[] } | null;
    const attemptedPath = state?.from?.pathname;

    const handleGoBack = () => {
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            navigate('/dashboard');
        }
    };

    const roleLabel = user?.role ? user.role.replace(/_/g, ' ') : 'Employee';
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#F4F5F8] flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
            <div className="w-full max-w-xl">
                {/* Main Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 sm:p-10 relative overflow-hidden">
                    {/* Top ambient glow decoration */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600" />
                    
                    {/* Header with Icon and Badge */}
                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-5">
                            <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10 transition-transform hover:scale-105 duration-300">
                                <Lock size={36} className="text-rose-600" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20 ring-4 ring-white">
                                <ShieldAlert size={15} />
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-[11px] font-black uppercase tracking-wider mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            403 • Access Restricted
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
                            Permission Required
                        </h1>

                        <p className="text-[13.5px] text-slate-500 max-w-md leading-relaxed">
                            You don't have authorization to access this section with your current account privileges.
                        </p>
                    </div>

                    {/* User Identity & Context Pill */}
                    <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-[13px] shadow-md shadow-indigo-600/20 flex-shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13.5px] font-bold text-slate-900 truncate">
                                        {user?.name || 'Current User'}
                                    </p>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                                        {roleLabel}
                                    </span>
                                </div>
                                <p className="text-[11.5px] text-slate-400 truncate mt-0.5">
                                    {user?.email || 'authenticated user'}
                                </p>
                            </div>
                        </div>

                        {attemptedPath && (
                            <div className="sm:text-right text-[11px] text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-200/70 pt-2 sm:pt-0 sm:pl-4">
                                <span className="block font-semibold text-slate-500">Target Resource:</span>
                                <code className="font-mono text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded text-[11px]">
                                    {attemptedPath}
                                </code>
                            </div>
                        )}
                    </div>

                    {/* Helpful Context Notice */}
                    <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/50 flex items-start gap-3">
                        <HelpCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-[12px] text-amber-900 leading-relaxed">
                            <p className="font-bold">Need elevated permissions?</p>
                            <p className="text-amber-700/90 mt-0.5">
                                If your role requires access to this module, reach out to your organization administrator or HR operations to adjust your role assignments.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="w-full sm:flex-1 py-3 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 group"
                        >
                            <LayoutDashboard size={15} />
                            <span>Return to Dashboard</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleGoBack}
                            className="w-full sm:w-auto py-3 px-5 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={15} />
                            <span>Go Back</span>
                        </button>
                    </div>

                    {/* Quick Links Footer */}
                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-6 text-[12px] text-slate-400 font-semibold">
                        <Link 
                            to="/profile" 
                            className="hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                        >
                            <User size={13} /> My Profile
                        </Link>
                        <span>•</span>
                        <Link 
                            to="/settings" 
                            className="hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                        >
                            <Settings size={13} /> Settings & Preferences
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
