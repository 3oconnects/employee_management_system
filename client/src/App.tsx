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

// ─── ROOT REDIRECT ─────────────────────────────────────────────────────────

const RootRedirect = () => {
    const { isAuthenticated } = useAuthStore();
    if (isAuthenticated) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

// ─── SUSPENSE WRAPPER ───────────────────────────────────────────────────────

const PageLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<LoadingSpinner text="Synchronizing module..." className="h-[60vh]" />}>
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
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'super_admin']}>
                            <PageLoader><Onboarding /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/employees" element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'super_admin']}>
                            <PageLoader><EmployeeTable /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'super_admin']}>
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
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'employee', 'super_admin']}>
                            <PageLoader><GeneratePayroll /></PageLoader>
                        </ProtectedRoute>
                    } />

                    {/* Admin-only routes */}
                    <Route path="/approvals" element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'super_admin']}>
                            <PageLoader><Approvals /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/organization" element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'super_admin']}>
                            <PageLoader><OrganizationPage /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/organization/deep-dive/:type/:id" element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'super_admin']}>
                            <PageLoader><StructuralDeepDivePage /></PageLoader>
                        </ProtectedRoute>
                    } />
                    <Route path="/audit-logs" element={
                        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                            <PageLoader>
                                <AuditLogPage />
                            </PageLoader>
                        </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                            <PageLoader><Settings /></PageLoader>
                        </ProtectedRoute>
                    } />

                    <Route path="/unauthorized" element={
                        <div className="flex flex-col items-center justify-center h-[70vh] p-8">
                            <div className="w-24 h-24 bg-rose-50 rounded-[28px] flex items-center justify-center text-rose-500 mb-8 shadow-xl shadow-rose-500/10 animate-in zoom-in-50 duration-500">
                                <ShieldAlert size={48} />
                            </div>
                            <div className="text-center max-w-md animate-in slide-in-from-bottom-4 duration-700">
                                <h1 className="text-4xl font-black text-primary tracking-tighter mb-4">Access Denied</h1>
                                <p className="text-[13px] text-text-muted font-bold uppercase tracking-widest leading-relaxed mb-10">
                                    You do not have permission to access this secure module.
                                </p>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    className="px-10 py-4 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] hover:bg-primary-soft hover:shadow-2xl hover:shadow-primary/20 transition-all flex items-center gap-3 mx-auto"
                                >
                                    <ArrowLeft size={16} /> Return to Dashboard
                                </button>
                            </div>
                        </div>
                    } />
                </Route>

                <Route path="*" element={
                    <div className="flex flex-col items-center justify-center h-screen bg-white p-8">
                        <div className="w-32 h-32 bg-primary/5 rounded-[40px] flex items-center justify-center text-primary/20 mb-12 animate-pulse">
                            <Terminal size={64} />
                        </div>
                        <div className="text-center max-w-lg">
                            <h1 className="text-6xl font-black text-primary tracking-tighter mb-4">404 - Not Found</h1>
                            <p className="text-[14px] text-text-muted font-bold uppercase tracking-[0.2em] leading-relaxed mb-12">
                                The page you are looking for does not exist within the system.
                            </p>
                            <button 
                                onClick={() => navigate('/')}
                                className="px-12 py-4 bg-primary text-white rounded-xl text-[12px] font-black uppercase tracking-[0.2em] hover:bg-primary-soft hover:shadow-2xl hover:shadow-primary/20 transition-all"
                            >
                                Recalibrate to Home
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

