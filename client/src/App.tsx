import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';
import { ToastContainer, LoadingSpinner } from './components/ui';
import { ShieldAlert, Terminal, ArrowLeft, History, Database, Activity, User, Clock } from 'lucide-react';

// ─── LAZY LOADED MODULES ───────────────────────────────────────────────────

const Dashboard = lazy(() => import('./modules/dashboard/pages/Dashboard'));
const EmployeeTable = lazy(() => import('./modules/employees/components/EmployeeTable'));
const ApplyLeave = lazy(() => import('./modules/leave/pages/ApplyLeave'));
const GeneratePayroll = lazy(() => import('./modules/payroll/pages/GeneratePayroll'));
const Onboarding = lazy(() => import('./modules/onboarding/pages/Onboarding'));
const Attendance = lazy(() => import('./modules/attendance/pages/Attendance'));
const Timesheets = lazy(() => import('./modules/timesheet/pages/Timesheets'));
const Reports = lazy(() => import('./modules/reports/pages/Reports'));
const Profile = lazy(() => import('./modules/profile/pages/Profile'));
const Settings = lazy(() => import('./modules/settings/pages/Settings'));
const Approvals = lazy(() => import('./modules/approvals/pages/Approvals'));
const OrganizationPage = lazy(() => import('./modules/organization/pages/OrganizationPage'));
const StructuralDeepDivePage = lazy(() => import('./modules/organization/pages/StructuralDeepDivePage'));

const AuditLogPage = lazy(() => import('./modules/audit/pages/AuditLogPage'));
const ChangePasswordPage = lazy(() => import('./modules/auth/pages/ChangePasswordPage'));
const UnauthorizedPage = lazy(() => import('./modules/auth/pages/UnauthorizedPage'));
const CandidateOfferAcceptance = lazy(() => import('./modules/onboarding/pages/CandidateOfferAcceptance'));

// ─── ROOT REDIRECT ─────────────────────────────────────────────────────────

const RootRedirect = () => {
    const { isAuthenticated } = useAuthStore();
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

// ─── SUSPENSE WRAPPER ───────────────────────────────────────────────────────

const PageLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<LoadingSpinner text="Loading..." className="h-[60vh]" />}>
        {children}
    </Suspense>
);

// ─── APP ────────────────────────────────────────────────────────────────────

function App() {
    const navigate = useNavigate();
    return (
        <>
            <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/offer/accept/:token" element={<PageLoader><CandidateOfferAcceptance /></PageLoader>} />
                <Route path="/offer-acceptance/:token" element={<PageLoader><CandidateOfferAcceptance /></PageLoader>} />
                <Route path="/change-password" element={
                    <ProtectedRoute><PageLoader><ChangePasswordPage /></PageLoader></ProtectedRoute>
                } />

                <Route element={<MainLayout />}>
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <PageLoader><Dashboard /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/onboarding" element={
                        <ProtectedRoute requiredPermissions={['onboarding:manage']}>
                            <PageLoader><Onboarding /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/employees" element={
                        <ProtectedRoute requiredPermissions={['employees:read', 'employee.view', 'employees:manage']}>
                            <PageLoader><EmployeeTable /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                        <ProtectedRoute requiredPermissions={['reports:view']}>
                            <PageLoader><Reports /></PageLoader>
                        </ProtectedRoute>
                    } />

                    {/* Accessible by all authenticated users */}
                    <Route path="/profile" element={
                        <ProtectedRoute><PageLoader><Profile /></PageLoader></ProtectedRoute>
                    } />
                    <Route path="/profile/:id" element={
                        <ProtectedRoute><PageLoader><Profile /></PageLoader></ProtectedRoute>
                    } />
                    <Route path="/attendance" element={
                        <ProtectedRoute><PageLoader><Attendance /></PageLoader></ProtectedRoute>
                    } />
                    <Route path="/leave" element={
                        <ProtectedRoute><PageLoader><ApplyLeave /></PageLoader></ProtectedRoute>
                    } />
                    <Route path="/timesheet" element={
                        <ProtectedRoute><PageLoader><Timesheets /></PageLoader></ProtectedRoute>
                    } />
                    <Route path="/payroll" element={
                        <ProtectedRoute requiredPermissions={['payroll:read', 'payroll:manage', 'payroll.process']}>
                            <PageLoader><GeneratePayroll /></PageLoader>
                        </ProtectedRoute>
                    } />

                    {/* Permission-guarded administration routes */}
                    <Route path="/approvals" element={
                        <ProtectedRoute requiredPermissions={['approvals:read', 'approvals:manage', 'leave:approve', 'timesheet:approve', 'claims:approve']}>
                            <PageLoader><Approvals /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/organization" element={
                        <ProtectedRoute requiredPermissions={['organization:read', 'organization:manage', 'governance:read']}>
                            <PageLoader><OrganizationPage /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/organization/deep-dive/:type/:id" element={
                        <ProtectedRoute requiredPermissions={['organization:read', 'organization:manage', 'governance:read']}>
                            <PageLoader><StructuralDeepDivePage /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/audit-logs" element={
                        <ProtectedRoute requiredPermissions={['audit:read']}>
                            <PageLoader>
                                <AuditLogPage />
                            </PageLoader>
                        </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <PageLoader><Settings /></PageLoader>
                        </ProtectedRoute>
                    } />

                    <Route path="/unauthorized" element={
                        <PageLoader><UnauthorizedPage /></PageLoader>
                    } />
                </Route>

                <Route path="*" element={
                    <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-6 select-none">
                        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 sm:p-10 text-center">
                            <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6 shadow-sm">
                                <Terminal size={36} />
                            </div>
                            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider mb-3">
                                404 • Not Found
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Page Not Found</h1>
                            <p className="text-[13.5px] text-slate-500 leading-relaxed mb-8">
                                The page or resource you are looking for does not exist or may have been relocated.
                            </p>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                            >
                                <ArrowLeft size={15} /> Return to Dashboard
                            </button>
                        </div>
                    </div>
                } />
            </Routes>

            {/* Global toast notifications */}
            <ToastContainer />
        </>
    );
}

export default App;

