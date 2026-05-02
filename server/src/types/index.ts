// ============================================================================
// EMS BACKEND — CENTRAL TYPE DEFINITIONS
// ============================================================================
// All shared interfaces, DTOs, and enums for the backend.
// Controllers, Services, and Repositories should import types from here.
// ============================================================================

import { Request } from 'express';

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    HR = 'hr',
    MANAGER = 'manager',
    EMPLOYEE = 'employee',
}

export enum LeaveStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
}

export enum TimesheetStatus {
    DRAFT = 'draft',
    SUBMITTED = 'submitted',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum AttendanceStatus {
    PRESENT = 'present',
    HALF_DAY = 'half_day',
    ON_DUTY = 'on_duty',
    ABSENT = 'absent',
}

export enum EmployeeStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ONBOARDING = 'onboarding',
    TERMINATED = 'terminated',
}

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    PAYROLL_RUN = 'PAYROLL_RUN',
    LEAVE_APPROVE = 'LEAVE_APPROVE',
    LEAVE_REJECT = 'LEAVE_REJECT',
    ATTENDANCE_REGULARIZE = 'ATTENDANCE_REGULARIZE',
}

// ─── JWT & AUTH ─────────────────────────────────────────────────────────────

export interface JwtPayload {
    userId: number;
    email: string;
    tenantId: string;
    role: UserRole;
    dashboard_type?: string;
    permissions: string[];
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

// ─── TENANT ─────────────────────────────────────────────────────────────────

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain?: string;
    logo_url?: string;
    is_active: boolean;
    settings: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

// ─── USER ───────────────────────────────────────────────────────────────────

export interface User {
    id: number;
    tenant_id: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    role_id?: number;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    is_active: boolean;
    last_login?: Date;
    refresh_token?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface UserDTO {
    id: number;
    tenant_id: string;
    name: string;
    email: string;
    role: UserRole;
    employee_id?: string;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    permissions: string[];
}

// ─── ROLE & PERMISSIONS ─────────────────────────────────────────────────────

export interface Role {
    id: number;
    tenant_id: string;
    name: string;
    description?: string;
    is_system: boolean;
    created_at: Date;
}

export interface Permission {
    id: number;
    module: string;
    action: string;
    description?: string;
}

export interface RolePermission {
    role_id: number;
    permission_id: number;
}

// ─── EMPLOYEE ───────────────────────────────────────────────────────────────

export interface Employee {
    id: string;
    tenant_id: string;
    user_id?: number;
    name: string;
    email?: string;
    position?: string;
    department?: string;
    join_date?: Date;
    status: EmployeeStatus;
    manager_id?: string;
    created_at: Date;
    updated_at: Date;
    deleted_at?: Date;
}

export interface EmployeeDTO {
    id: string;
    name: string;
    email?: string;
    position?: string;
    department?: string;
    join_date?: string;
    status: EmployeeStatus;
    manager_id?: string;
}

// ─── PAYROLL ────────────────────────────────────────────────────────────────

export interface PayrollProfile {
    employee_id: string;
    tenant_id: string;
    name?: string;
    department?: string;
    role?: string;
    annual_ctc: number;
    bank_account?: string;
    tax_regime?: string;
    basic_salary: number;
    hra: number;
    allowances: number;
    bonus: number;
    overtime: number;
    created_at: Date;
    updated_at: Date;
}

export interface PayrollEntry {
    id: number;
    tenant_id: string;
    payroll_run_id: string;
    employee_id: string;
    month: string;
    year: string;
    gross_salary: number;
    pf_employee: number;
    esi_employee: number;
    professional_tax: number;
    tds: number;
    total_deductions: number;
    net_salary: number;
    created_at: Date;
}

export interface PayrollSalaryCalculation {
    gross: number;
    pf: number;
    esi: number;
    pt: number;
    tds: number;
    totalDeductions: number;
    net: number;
}

// ─── ATTENDANCE ─────────────────────────────────────────────────────────────

export interface AttendanceRecord {
    id: number;
    tenant_id: string;
    user_id: number;
    check_in: Date;
    check_out?: Date;
    ip_address?: string;
    status: AttendanceStatus;
    created_at: Date;
}

// ─── LEAVE ──────────────────────────────────────────────────────────────────

export interface LeaveRequest {
    id: number;
    tenant_id: string;
    user_id: number;
    leave_type_id: number;
    start_date: Date;
    end_date: Date;
    reason?: string;
    status: LeaveStatus;
    approved_by?: number;
    created_at: Date;
    updated_at: Date;
}

export interface LeaveType {
    id: number;
    tenant_id: string;
    name: string;
    annual_quota: number;
    created_at: Date;
}

// ─── TIMESHEET ──────────────────────────────────────────────────────────────

export interface Timesheet {
    id: number;
    tenant_id: string;
    user_id: number;
    week_start: Date;
    week_end: Date;
    total_hours: number;
    status: TimesheetStatus;
    approved_by?: number;
    remarks?: string;
    created_at: Date;
    updated_at: Date;
}

export interface TimesheetEntry {
    id: number;
    timesheet_id: number;
    project_name: string;
    task_desc?: string;
    mon_hours: number;
    tue_hours: number;
    wed_hours: number;
    thu_hours: number;
    fri_hours: number;
    sat_hours: number;
    sun_hours: number;
    created_at: Date;
}

// ─── AUDIT LOG ──────────────────────────────────────────────────────────────

export interface AuditLog {
    id: number;
    tenant_id: string;
    user_id: number;
    action: AuditAction;
    entity_type: string;
    entity_id: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: Date;
}

// ─── NOTIFICATION ───────────────────────────────────────────────────────────

export interface Notification {
    id: number;
    tenant_id: string;
    user_id: number;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    is_read: boolean;
    link?: string;
    created_at: Date;
}

// ─── API RESPONSE WRAPPERS ──────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        totalItems: number;
        totalPages: number;
    };
}

// ─── QUERY HELPERS ──────────────────────────────────────────────────────────

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export interface SortParams {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}
