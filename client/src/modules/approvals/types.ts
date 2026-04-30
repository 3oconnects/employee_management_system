export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ApprovalType = 
    | 'role_change' 
    | 'leave' 
    | 'employee_edit' 
    | 'promotion' 
    | 'onboarding' 
    | 'team_change'
    | 'compensation_change'
    | 'document_approval'
    | 'attendance';

export interface RoleChangeMetadata {
    current_role: string;
    requested_role: string;
    requested_role_id: string;
    reason?: string;
}

export interface LeaveMetadata {
    leave_type: string;
    start_date: string;
    end_date: string;
    days: number;
    reason: string;
}

export interface EmployeeEditMetadata {
    field: string;
    old_value: any;
    new_value: any;
    reason?: string;
}

export interface PromotionMetadata {
    current_designation: string;
    requested_designation: string;
    salary_change_percent?: number;
    effective_date: string;
}

export interface TeamChangeMetadata {
    current_team: string;
    target_team: string;
    manager_id?: string;
    effective_date: string;
}

export interface BaseApprovalRequest {
    id: string;
    employee_id: string;
    employee_name: string;
    department?: string;
    tenant_id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    metadata: any; 
    requested_by: string;
    requested_by_name?: string;
    actioned_by?: string;
    actioned_by_name?: string;
    actioned_at?: string;
    created_at: string;
    updated_at: string;
}

// Helper to cast metadata
export function getMetadata<T>(req: BaseApprovalRequest): T {
    return req.metadata as T;
}
