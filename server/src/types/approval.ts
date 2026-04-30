export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ApprovalType = 
    | 'role_change' 
    | 'leave' 
    | 'employee_edit' 
    | 'promotion' 
    | 'onboarding' 
    | 'team_change'
    | 'compensation_change'
    | 'document_approval';

export interface ApprovalRequest {
    id: string;
    employee_id: string;
    tenant_id: string;
    type: ApprovalType;
    status: ApprovalStatus;
    metadata: any;
    requested_by: string;
    actioned_by?: string;
    actioned_at?: Date;
    created_at: Date;
    updated_at: Date;
}
