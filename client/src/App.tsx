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
                                <h1 className="text-4xl font-black text-primary tracking-tighter mb-4">Protocol Restriction</h1>
                                <p className="text-[13px] text-text-muted font-bold uppercase tracking-widest leading-relaxed mb-10">
                                    Your current authorization level is insufficient to access this secure module.
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
                            <h1 className="text-6xl font-black text-primary tracking-tighter mb-4">Void Protocol 404</h1>
                            <p className="text-[14px] text-text-muted font-bold uppercase tracking-[0.2em] leading-relaxed mb-12">
                                The requested resource coordinate does not exist within the current system matrix.
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

// ─── INLINE AUDIT LOG PAGE ──────────────────────────────────────────────────

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

    if (loading) return <LoadingSpinner text="Querying System Archive..." />;

    return (
        <div className="p-10 page-enter space-y-10 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                    <History size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-primary tracking-tighter">System Audit Log</h1>
                    <p className="text-[11px] text-text-muted font-black uppercase tracking-[0.3em] mt-2">Executive Compliance & Traceability Matrix</p>
                </div>
            </div>

            <div className="card-premium overflow-hidden border-primary-light/20 shadow-premium bg-white">
                <div className="px-8 py-5 bg-primary/5 border-b border-primary-light/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Activity size={16} className="text-primary-soft" />
                        <h3 className="text-[13px] font-black text-primary uppercase tracking-[0.2em]">Temporal Activity Stream</h3>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white border border-primary-light/10 rounded-lg">
                        <Database size={12} className="text-text-muted" />
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{logs.length} RECORDS</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-primary-light/5 text-[10px] font-black text-primary-soft uppercase tracking-[0.3em] border-b border-primary-light/10">
                                <th className="px-8 py-5">Action Protocol</th>
                                <th className="px-8 py-5">System Entity</th>
                                <th className="px-8 py-5">Operator Identifier</th>
                                <th className="px-8 py-5 text-right">Temporal Signature</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-primary-light/5">
                            {logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-primary/5 transition-all group">
                                    <td className="px-8 py-6">
                                        <span className="inline-flex px-3 py-1.5 rounded-lg bg-primary/5 text-primary font-black text-[10px] border border-primary/10 uppercase tracking-widest">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-[14px] font-bold text-primary">{log.entity_type}</p>
                                        <p className="text-[11px] text-text-muted font-bold mt-1 uppercase tracking-tighter opacity-60">ID: {log.entity_id || 'N/A'}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary-soft">
                                                <User size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-primary">{log.user_name || 'System Auto'}</p>
                                                <p className="text-[10px] text-text-muted font-bold tracking-tighter uppercase">{log.user_email || 'internal@precision.io'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2 text-primary font-black text-[13px] tracking-tight">
                                                <Clock size={14} className="text-primary-light" />
                                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                            <p className="text-[11px] text-text-muted font-bold mt-1 uppercase tracking-widest">{new Date(log.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-32 text-center">
                                        <div className="flex flex-col items-center opacity-30">
                                            <Activity size={48} className="text-primary-light mb-4" />
                                            <p className="text-[14px] font-black text-primary uppercase tracking-widest">Zero Activity Detected</p>
                                            <p className="text-[11px] text-text-muted font-bold mt-2">The system archive is currently in a baseline state.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default App;

