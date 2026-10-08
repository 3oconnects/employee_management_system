/**
 * Analytics Domain Submodels
 * 
 * Defines comprehensive, typed domain submodels for executive, managerial,
 * and individual employee business intelligence dashboards.
 */

// ─── ADMIN DASHBOARD SUBMODELS ──────────────────────────────────────────────

export interface AdminRecentActivitySubmodel {
    id: number;
    user_id: number;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: Date;
    user_name: string;
}

export type RecentActivity = AdminRecentActivitySubmodel;

export interface AdminHolidaySubmodel {
    name: string;
    date: Date;
    type: string;
}

export type Holiday = AdminHolidaySubmodel;

export interface AdminSalaryDistItemSubmodel {
    level: string;
    count: number;
    total_ctc: number;
}

export type SalaryDistItem = AdminSalaryDistItemSubmodel;

export interface AdminGenderDistSubmodel {
    male: number;
    female: number;
    other: number;
}

export interface AdminDeptDistItemSubmodel {
    name: string;
    count: number;
    percentage: number;
}

export interface AdminEmpTypeItemSubmodel {
    type: string;
    count: number;
}

export interface AdminHiringTrendItemSubmodel {
    month: string;
    hires: number;
    exits: number;
}

export interface AdminPayrollTrendItemSubmodel {
    month: string;
    amount: number;
}

export interface AdminOrgMetricsSubmodel {
    units: number;
    locations: number;
}

export interface AdminTodayAttendanceLogItemSubmodel {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
    employment_type: string | null;
    email: string;
    avatar_url: string | null;
    employee_id: string;
    check_in: Date | string | null;
    check_out: Date | string | null;
    location: string;
    today_hours: number;
    days_present: number;
    total_hours: number;
    avg_daily_hours: number;
    overtime_hours: number;
}

export interface AdminDashboardSubmodel {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    newHiresThisMonth: number;
    exitedThisMonth: number;
    totalPayrollCost: number;
    avgSalary: number;
    pendingLeaves: number;
    pendingTimesheets: number;
    todayPresent: number;
    onLeaveToday: number;
    avgAttendanceRate: number;
    attritionRate: number;
    genderDistribution: AdminGenderDistSubmodel;
    departmentDistribution: AdminDeptDistItemSubmodel[];
    employmentTypeBreakdown: AdminEmpTypeItemSubmodel[];
    monthlyHiringTrend: AdminHiringTrendItemSubmodel[];
    payrollTrend: AdminPayrollTrendItemSubmodel[];
    recentActivities: AdminRecentActivitySubmodel[];
    upcomingHolidays: AdminHolidaySubmodel[];
    headcountGrowth: number;
    todayAttendanceLog: AdminTodayAttendanceLogItemSubmodel[];
    salaryDistribution: AdminSalaryDistItemSubmodel[];
    orgMetrics: AdminOrgMetricsSubmodel;
}

export type AdminDashboardData = AdminDashboardSubmodel;

// ─── MANAGER DASHBOARD SUBMODELS ────────────────────────────────────────────

export interface ManagerTeamMemberSubmodel {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
    status: string | null;
    email: string;
    phone?: string | null;
    join_date?: string | Date | null;
    employment_type?: string | null;
    user_id?: number | null;
    role?: string | null;
    today_check_in?: Date | string | null;
    on_leave?: string | null;
}

export interface ManagerTeamAttendanceSubmodel {
    name: string;
    check_in: Date | string | null;
    check_out: Date | string | null;
    att_status: 'on_time' | 'late' | 'absent' | string;
}

export interface ManagerPendingLeaveSubmodel {
    id: number;
    employee_id: string;
    type: string;
    start_date: Date | string;
    end_date: Date | string;
    reason: string | null;
    status: string;
    created_at: Date | string;
    applicant_name: string;
    leave_type: string;
}

export interface ManagerLateCheckinSubmodel {
    name: string;
    check_in: Date | string;
    hour: number;
    minute: number;
}

export interface ManagerTimesheetStatusSubmodel {
    submitted: number;
    approved: number;
    pending: number;
}

export interface ManagerDashboardSubmodel {
    teamSize: number;
    teamMembers: ManagerTeamMemberSubmodel[];
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    attendanceRate: number;
    teamAttendance: ManagerTeamAttendanceSubmodel[];
    pendingLeaves: ManagerPendingLeaveSubmodel[];
    pendingLeaveCount: number;
    lateCheckins: ManagerLateCheckinSubmodel[];
    timesheetStatus: ManagerTimesheetStatusSubmodel;
}

// ─── EMPLOYEE DASHBOARD SUBMODELS ───────────────────────────────────────────

export interface EmployeeDashboardAttendanceSubmodel {
    status: 'IN' | 'OUT' | 'COMPLETED' | string;
    checkIn: Date | string | null;
    totalHoursToday: string;
}

export interface EmployeeDashboardMonthlySummarySubmodel {
    presentDays: number;
    avgHours: string;
    lateDays: number;
}

export interface EmployeeLeaveBalanceSubmodel {
    leave_type_id: number;
    name: string;
    annual_quota: number;
    used: number;
    available: number;
}

export interface EmployeeWeeklyHoursSubmodel {
    day: string;
    date: string | Date;
    hours: string;
}

export interface EmployeeDashboardSubmodel {
    attendance: EmployeeDashboardAttendanceSubmodel;
    monthlySummary: EmployeeDashboardMonthlySummarySubmodel;
    leaveBalances: EmployeeLeaveBalanceSubmodel[];
    upcomingHolidays: AdminHolidaySubmodel[];
    recentPayslip: any | null;
    notifications: any[];
    weeklyHours: EmployeeWeeklyHoursSubmodel[];
}

// ─── EMPLOYEE PROFILE SUBMODELS ─────────────────────────────────────────────

export interface ProfileAttendanceSummarySubmodel {
    present_days: number;
    avg_hours: number;
    late_arrivals: number;
}

export interface EmployeeProfileSubmodel {
    employee: any | null;
    compensation: any | null;
    documents: any[];
    emergencyContacts: any[];
    performanceReviews: any[];
    attendanceSummary: ProfileAttendanceSummarySubmodel;
    leaveBalances: any[];
}

// ─── INDIVIDUAL ATTENDANCE ANALYSIS SUBMODELS ────────────────────────────────

export interface AttendanceAnalysisEmployeeSubmodel {
    id: string;
    name: string;
    email: string;
    department: string | null;
    position: string | null;
    status: string | null;
    avatar_url: string | null;
    employment_type: string | null;
    employee_id: string;
    join_date: Date | string | null;
}

export interface AttendanceAnalysisPeriodSubmodel {
    month: number;
    year: number;
    daysInMonth: number;
    elapsedWorkingDays: number;
    totalWorkingDays: number;
}

export interface AttendanceAnalysisMetricsSubmodel {
    daysPresent: number;
    daysAbsent: number;
    approvedLeaveDays: number;
    totalHoursWorked: number;
    avgDailyHours: number;
    overtimeHours: number;
    attendanceRate: number;
    onTimeArrivals: number;
    lateArrivals: number;
    onTimeRate: number;
}

export interface AttendanceAnalysisWeeklyDaySubmodel {
    date: string;
    dayName: string;
    hours: number;
    targetHours: number;
    status: string;
}

export interface AttendanceAnalysisHistoryItemSubmodel {
    id: number;
    date: string;
    checkIn: Date | string | null;
    checkOut: Date | string | null;
    durationHours: number;
    overtimeHours: number;
    isLate: boolean;
    status: string;
    location: string;
}

export interface EmployeeAttendanceAnalysisSubmodel {
    employee: AttendanceAnalysisEmployeeSubmodel;
    period: AttendanceAnalysisPeriodSubmodel;
    metrics: AttendanceAnalysisMetricsSubmodel;
    weeklyBreakdown: AttendanceAnalysisWeeklyDaySubmodel[];
    history: AttendanceAnalysisHistoryItemSubmodel[];
    leaves: any[];
}
