import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';
import { ToastContainer, LoadingSpinner } from './components/ui';

// ============================================================================
// EMS FRONTEND — APP (UPGRADED)
// ============================================================================
// Changes:
//   1. Lazy loading for all page modules (code splitting)
//   2. Added audit-logs route
//   3. Toast notification container
//   4. Suspense fallback for loading states
// ============================================================================

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

// ─── ROOT REDIRECT ─────────────────────────────────────────────────────────

const RootRedirect = () => {
    const { isAuthenticated } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <Navigate to="/dashboard" replace />;
};

// ─── SUSPENSE WRAPPER ───────────────────────────────────────────────────────

const PageLoader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<LoadingSpinner text="Loading module..." className="h-[60vh]" />}>
        {children}
    </Suspense>
);

// ─── APP ────────────────────────────────────────────────────────────────────

function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />

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
                    <Route path="/audit-logs" element={
                        <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                            <PageLoader>
                                {/* Inline audit log page — can be extracted later */}
                                <AuditLogPage />
                            </PageLoader>
                        </ProtectedRoute>
                    } />

                    <Route path="/unauthorized" element={
                        <div className="flex items-center justify-center h-[60vh]">
                            <div className="text-center">
                                <h1 className="text-4xl font-bold text-red-500 mb-2">403</h1>
                                <p className="text-slate-500">You don't have permission to access this page.</p>
                            </div>
                        </div>
                    } />
                </Route>

                <Route path="*" element={
                    <div className="flex items-center justify-center h-screen bg-slate-50">
                        <div className="text-center">
                            <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
                            <p className="text-slate-500">Page not found</p>
                        </div>
                    </div>
                } />
            </Routes>

            {/* Global toast notifications */}
            <ToastContainer />
        </>
    );
}

// ─── INLINE AUDIT LOG PAGE (simple) ─────────────────────────────────────────

function AuditLogPage() {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        import('./services/api').then(({ default: api }) => {
            api.get('/audit-logs?limit=100')
                .then(res => setLogs(res.data.data || []))
                .catch(() => {})
                .finally(() => setLoading(false));
        });
    }, []);

    if (loading) return <LoadingSpinner text="Loading audit logs..." />;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Audit Logs</h1>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Action</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Entity</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {logs.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">{log.action}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{log.user_name || log.user_email || '-'}</td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400">No audit logs yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default App;
