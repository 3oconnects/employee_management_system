/**
 * Employee Attendance Deep-Dive Analytics Domain Service
 * 
 * Computes individual attendance analysis including KPIs (presence, overtime, late arrival counts),
 * calendar working days elapsed, 7-day weekly breakdown, daily shift history, and approved leaves.
 */

import { pool } from '../../config/db';
import { AppError } from '../../core/errors/AppError';
import { 
    EmployeeAttendanceAnalysisSubmodel, 
    AttendanceAnalysisHistoryItemSubmodel,
    AttendanceAnalysisWeeklyDaySubmodel 
} from './analytics.submodels';

export async function fetchEmployeeAttendanceAnalysis(
    employeeId: string, 
    tenantId: string, 
    month: number, 
    year: number
): Promise<EmployeeAttendanceAnalysisSubmodel> {
    // 1. Resolve employee
    const empRes = await pool.query(`
        SELECT 
            e.id, e.name, e.department, e.position, e.join_date, e.email, e.status, 
            e.avatar_url, e.employment_type,
            u.id AS user_id, u.role
        FROM employees e
        LEFT JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
        WHERE (e.id = $1 OR u.id::text = $1)
          AND e.tenant_id = $2
        LIMIT 1
    `, [employeeId, tenantId]);

    const employee = empRes.rows[0];
    if (!employee) {
        throw AppError.notFound('Employee record not found');
    }

    const resolvedEmpId = employee.id;
    const resolvedUserId = employee.user_id;

    // 2. Fetch all attendance logs for the requested month & year
    const attLogsRes = await pool.query(`
        SELECT 
            id,
            COALESCE(check_in, check_in_time) AS check_in,
            COALESCE(check_out, check_out_time) AS check_out,
            TO_CHAR(COALESCE(check_in, check_in_time, date), 'YYYY-MM-DD') AS date_str,
            status,
            COALESCE(location, 'Main Office') AS location
        FROM attendance
        WHERE (employee_id = $1 OR (user_id IS NOT NULL AND user_id = $2))
          AND tenant_id = $3
          AND EXTRACT(MONTH FROM COALESCE(check_in, check_in_time, date)) = $4
          AND EXTRACT(YEAR FROM COALESCE(check_in, check_in_time, date)) = $5
        ORDER BY COALESCE(check_in, check_in_time, date) DESC
    `, [resolvedEmpId, resolvedUserId, tenantId, month, year]);

    // 3. Fetch leaves for this month
    const leavesRes = await pool.query(`
        SELECT id, type, start_date, end_date, reason, status
        FROM leave_requests
        WHERE (employee_id = $1 OR (user_id IS NOT NULL AND user_id = $2))
          AND tenant_id = $3
          AND status = 'approved'
          AND (
              EXTRACT(MONTH FROM start_date) = $4 OR EXTRACT(MONTH FROM end_date) = $4
          )
    `, [resolvedEmpId, resolvedUserId, tenantId, month]);

    // 4. Calculate total working days in month (Mon-Fri)
    const daysInMonth = new Date(year, month, 0).getDate();
    const now = new Date();
    const isCurrentMonth = (now.getFullYear() === year && (now.getMonth() + 1) === month);
    const limitDay = isCurrentMonth ? now.getDate() : daysInMonth;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let totalWorkingDays = 0;
    let elapsedWorkingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month - 1, d).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            totalWorkingDays++;
            if (d <= limitDay) {
                elapsedWorkingDays++;
            }
        }
    }
    if (elapsedWorkingDays === 0) elapsedWorkingDays = 1;

    // Process daily logs
    const uniquePresentDates = new Set<string>();
    let totalHoursLogged = 0;
    let overtimeHoursLogged = 0;
    let lateArrivalCount = 0;

    const historyItems: AttendanceAnalysisHistoryItemSubmodel[] = attLogsRes.rows.map(row => {
        const checkInDate = row.check_in ? new Date(row.check_in) : null;
        const checkOutDate = row.check_out ? new Date(row.check_out) : null;
        const dateStr = row.date_str || (checkInDate ? `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}` : '');

        if (dateStr) uniquePresentDates.add(dateStr);

        let durationHours = 0;
        if (checkInDate && checkOutDate) {
            durationHours = Math.max(0, (checkOutDate.getTime() - checkInDate.getTime()) / 3600000);
        } else if (checkInDate && dateStr === todayStr) {
            durationHours = Math.max(0, (now.getTime() - checkInDate.getTime()) / 3600000);
        } else if (checkInDate) {
            durationHours = 8.0; // standard workday baseline
        }

        totalHoursLogged += durationHours;
        const ot = Math.max(0, durationHours - 8.0);
        overtimeHoursLogged += ot;

        const isLate = checkInDate 
            ? (checkInDate.getHours() > 9 || (checkInDate.getHours() === 9 && checkInDate.getMinutes() > 30))
            : false;
        if (isLate) lateArrivalCount++;

        return {
            id: row.id,
            date: dateStr,
            checkIn: row.check_in,
            checkOut: row.check_out,
            durationHours: parseFloat(durationHours.toFixed(2)),
            overtimeHours: parseFloat(ot.toFixed(2)),
            isLate,
            status: isLate ? 'late' : (row.status || 'present'),
            location: row.location || 'Main Office',
        };
    });

    const daysPresent = uniquePresentDates.size;
    const approvedLeaveDays = leavesRes.rows.length;
    const absentDays = Math.max(0, elapsedWorkingDays - daysPresent - approvedLeaveDays);
    const avgDailyHours = daysPresent > 0 ? parseFloat((totalHoursLogged / daysPresent).toFixed(1)) : 0;
    const attendanceRate = Math.min(100, Math.round((daysPresent / (elapsedWorkingDays || 1)) * 100));
    const onTimeArrivals = Math.max(0, daysPresent - lateArrivalCount);
    const onTimeRate = daysPresent > 0 ? Math.round((onTimeArrivals / daysPresent) * 100) : 100;

    // Weekly breakdown (last 7 calendar days)
    const weeklyBreakdown: AttendanceAnalysisWeeklyDaySubmodel[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayEntry = historyItems.find(h => h.date === dStr);
        const isWeekend = (d.getDay() === 0 || d.getDay() === 6);
        
        weeklyBreakdown.push({
            date: dStr,
            dayName,
            hours: dayEntry ? dayEntry.durationHours : 0,
            targetHours: isWeekend ? 0 : 8.0,
            status: dayEntry ? dayEntry.status : (isWeekend ? 'weekend' : 'absent'),
        });
    }

    return {
        employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
            status: employee.status,
            avatar_url: employee.avatar_url,
            employment_type: employee.employment_type,
            employee_id: employee.id,
            join_date: employee.join_date,
        },
        period: {
            month,
            year,
            daysInMonth,
            elapsedWorkingDays,
            totalWorkingDays,
        },
        metrics: {
            daysPresent,
            daysAbsent: absentDays,
            approvedLeaveDays,
            totalHoursWorked: parseFloat(totalHoursLogged.toFixed(1)),
            avgDailyHours,
            overtimeHours: parseFloat(overtimeHoursLogged.toFixed(1)),
            attendanceRate,
            onTimeArrivals,
            lateArrivals: lateArrivalCount,
            onTimeRate,
        },
        weeklyBreakdown,
        history: historyItems,
        leaves: leavesRes.rows,
    };
}
