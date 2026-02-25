import { Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/login" element={<LoginPage />} />

            <Route element={<MainLayout />}>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
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
                        <ProtectedRoute>
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
                        <ProtectedRoute>
                            <ApplyLeave />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/timesheet"
                    element={
                        <ProtectedRoute>
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
                        <ProtectedRoute allowedRoles={['admin', 'hr']}>
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
