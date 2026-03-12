import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './modules/dashboard/pages/Dashboard';
import EmployeeTable from './modules/employees/components/EmployeeTable';
import ApplyLeave from './modules/leave/pages/ApplyLeave';
import GeneratePayroll from './modules/payroll/pages/GeneratePayroll';
import ProtectedRoute from './modules/auth/components/ProtectedRoute';
import LoginPage from './modules/auth/pages/LoginPage';
import Onboarding from './modules/onboarding/pages/Onboarding';
import Attendance from './modules/attendance/pages/Attendance';
import Timesheets from './modules/timesheet/pages/Timesheets';
import Reports from './modules/reports/pages/Reports';

const RootRedirect = () => {
    const { isAuthenticated, user } = useAuthStore();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role === 'employee') return <Navigate to="/payroll" replace />;
    return <Navigate to="/dashboard" replace />;
};

function App() {
    return (
        <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route path="/login" element={<LoginPage />} />

            <Route element={<MainLayout />}>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/onboarding"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr']}>
                            <Onboarding />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                            <Attendance />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/employees"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                            <EmployeeTable />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/leave"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                            <ApplyLeave />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/timesheet"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'manager']}>
                            <Timesheets />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/reports"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr']}>
                            <Reports />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/payroll"
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}>
                            <GeneratePayroll />
                        </ProtectedRoute>
                    }
                />

                {/* Fallback for unauthorized */}
                <Route path="/unauthorized" element={<div className="p-8 text-red-500 font-bold">Unauthorized Access</div>} />
            </Route>

            <Route path="*" element={<div className="p-8">404 Not Found</div>} />
        </Routes>
    );
}

export default App;
