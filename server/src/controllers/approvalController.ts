import { Request, Response } from 'express';
import { pool } from '../config/db';
import { AuthenticatedRequest } from '../types';

export const getApprovals = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { userId, role, tenantId } = req.user!;
        const { status = 'pending' } = req.query;

        console.log(`🔍 [Approvals] Fetching: ${status} | User: ${userId} | Role: ${role} | Tenant: ${tenantId}`);

        // 1. Get the current user's employee_id
        const empResult = await pool.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
        const currentEmployeeId = empResult.rows[0]?.id;
        console.log(`   Employee ID: ${currentEmployeeId}`);

        // 2. Determine the filter clause based on role
        let filterClause = "WHERE (ap.tenant_id = $1 OR ap.tenant_id IS NULL OR ap.tenant_id = '')"; 
        const params: any[] = [tenantId];

        if ((role === 'manager' || role === 'employee') && currentEmployeeId) {
            // Managers and Employees (acting as TLs) only see their direct reports
            filterClause += " AND (ap.manager_id = $2 OR ap.requested_by = $2)";
            params.push(currentEmployeeId);
        }

        const isHistory = status === 'history' || status === 'completed';
        const standardStatus = isHistory ? "('approved', 'rejected', 'completed')" : "('pending', 'active', 'onboarding')";
        const leaveStatus = isHistory ? "('approved', 'rejected', 'cancelled')" : "('pending', 'pending_audit')";
        const onboardingStatus = isHistory ? "('active', 'rejected')" : "('onboarding', 'pending')";

        const query = `
            WITH all_pending AS (
                -- Standard Approvals
                SELECT 
                    'std-' || approvals.id as id, 
                    approvals.employee_id as employee_id, 
                    employees.name as employee_name, 
                    employees.department as department, 
                    approvals.type as type, 
                    approvals.status as status, 
                    approvals.metadata::jsonb as metadata, 
                    approvals.requested_by as requested_by, 
                    approvals.created_at as created_at,
                    employees.manager_id as manager_id,
                    approvals.tenant_id as tenant_id
                FROM approvals
                JOIN employees ON approvals.employee_id = employees.id 
                WHERE LOWER(approvals.status) IN ${standardStatus} 

                UNION ALL

                -- Leave Requests
                SELECT 
                    'leave-' || l.id as id, 
                    l.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'leave' as type, 
                    l.status as status,
                    json_build_object('leave_type', l.type, 'start_date', l.start_date, 'end_date', l.end_date, 'reason', l.reason)::jsonb as metadata,
                    l.employee_id as requested_by, 
                    l.created_at as created_at,
                    e.manager_id as manager_id,
                    l.tenant_id as tenant_id
                FROM leave_requests l
                JOIN employees e ON l.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(l.status) IN ${leaveStatus})
                   OR (${isHistory} AND LOWER(l.status) IN ('approved', 'rejected', 'cancelled')) 

                UNION ALL

                -- Onboarding Candidates
                SELECT 
                    'onb-' || e.id as id, 
                    e.id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'onboarding' as type, 
                    e.status as status,
                    json_build_object('department', e.department, 'position', e.position)::jsonb as metadata,
                    e.id as requested_by, 
                    e.created_at as created_at,
                    e.manager_id as manager_id,
                    e.tenant_id as tenant_id
                FROM employees e
                WHERE LOWER(e.status) IN ${onboardingStatus} 

                UNION ALL

                -- Timesheets
                SELECT 
                    'ts-' || t.id as id, 
                    t.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'timesheet' as type, 
                    t.status as status,
                    json_build_object('project', t.project, 'hours', t.hours, 'date', t.date)::jsonb as metadata,
                    t.employee_id as requested_by, 
                    t.created_at as created_at,
                    e.manager_id as manager_id,
                    t.tenant_id as tenant_id
                FROM timesheets t
                JOIN employees e ON t.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(t.status) = 'submitted')
                   OR (${isHistory} AND LOWER(t.status) IN ('approved', 'rejected'))

                UNION ALL

                -- Expense Claims
                SELECT 
                    'claim-' || c.id as id, 
                    c.employee_id as employee_id, 
                    e.name as employee_name, 
                    e.department as department, 
                    'claim' as type, 
                    c.status as status,
                    json_build_object('category', c.category, 'amount', c.amount, 'description', c.description)::jsonb as metadata,
                    c.employee_id as requested_by, 
                    c.created_at as created_at,
                    e.manager_id as manager_id,
                    c.tenant_id as tenant_id
                FROM claims c
                JOIN employees e ON c.employee_id = e.id
                WHERE (NOT ${isHistory} AND LOWER(c.status) = 'pending')
                   OR (${isHistory} AND LOWER(c.status) IN ('approved', 'rejected'))
            )
            SELECT 
                id, employee_id, employee_name, department, type, status, metadata, requested_by, created_at, manager_id
            FROM all_pending ap
            WHERE 1=1
            ORDER BY department ASC, created_at DESC
        `;
        
        const result = await pool.query(query);
        res.json({ success: true, data: result.rows });
    } catch (err: any) {
        console.error('❌ APPROVALS HUB ERROR:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const createApprovalRequest = async (req: Request, res: Response) => {
    const { employeeId, type, status = 'pending' } = req.body;
    try {
        const id = `APP-${Date.now()}`;
        await pool.query('INSERT INTO approvals (id, employee_id, type, status) VALUES ($1, $2, $3, $4)', [id, employeeId, type, status]);
        res.status(201).json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};

export const updateApprovalAction = async (req: Request, res: Response) => {
    let { id } = req.params;
    const { action, type } = req.body; 
    
    // Strip prefix if exists (e.g., 'leave-1' -> '1')
    id = id.replace(/^(std|leave|onb|ts|claim)-/, '');
    
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    try {
        if (type === 'leave') {
            await pool.query('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, id]);
        } else if (type === 'onboarding') {
            const empStatus = action === 'approve' ? 'active' : 'rejected';
            await pool.query('UPDATE employees SET status = $1 WHERE id = $2', [empStatus, id]);
        } else if (type === 'timesheet') {
            await pool.query('UPDATE timesheets SET status = $1 WHERE id = $2', [status, id]);
        } else if (type === 'claim') {
            await pool.query('UPDATE claims SET status = $1 WHERE id = $2', [status, id]);
        } else {
            await pool.query('UPDATE approvals SET status = $1, actioned_at = NOW() WHERE id = $2', [status, id]);
        }
        res.json({ success: true });
    } catch (err: any) {
        console.error('❌ ACTION ERROR:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
};
