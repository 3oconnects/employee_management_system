/**
 * Employee Domain Submodels
 * 
 * Defines domain submodels and separation of concerns for the Employee aggregate:
 * 1. EmployeeProfileSubmodel - Core employee table profile attributes
 * 2. EmployeeUserSubmodel - Authentication account, role, permissions, and avatar
 * 3. EmployeePayrollSubmodel - Compensation and salary profile sync
 * 4. EmployeeEducationSubmodel - Formal education milestones
 * 5. EmployeeExperienceSubmodel - Previous work history records
 * 6. EmployeeEmergencyContactsSubmodel - Emergency contact details
 */

export interface EmployeeProfileSubmodel {
    name?: string;
    email?: string;
    department?: string | null;
    position?: string | null;
    join_date?: string | Date | null;
    status?: string | null;
    phone?: string | null;
    date_of_birth?: string | Date | null;
    gender?: string | null;
    personal_email?: string | null;
    blood_group?: string | null;
    marital_status?: string | null;
    nationality?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    location?: string | null;
    employment_type?: string | null;
    probation_end_date?: string | Date | null;
    confirmation_date?: string | Date | null;
    notice_period_days?: number | null;
    exit_date?: string | Date | null;
    exit_reason?: string | null;
    exit_type?: string | null;
    last_working_day?: string | Date | null;
    department_id?: number | null;
    team_id?: number | null;
    reporting_manager_id?: number | null;
    highest_degree?: string | null;
    field_of_study?: string | null;
    institution?: string | null;
    graduation_year?: string | null;
    internship_start_date?: string | Date | null;
    internship_end_date?: string | Date | null;
    internship_stipend?: number | null;
    internship_supervisor?: string | null;
    internship_college?: string | null;
    education_history?: any;
    experience_history?: any;
    bank_account_number?: string | null;
    annual_ctc?: number | null;
    tax_regime?: string | null;
    avatar_url?: string | null;
}

export interface EmployeeUserSubmodel {
    email?: string;
    role?: string;
    roleId?: number | null;
    avatarUrl?: string;
}

export interface EmployeePayrollSubmodel {
    name?: string;
    department?: string | null;
    position?: string | null;
    role?: string | null;
    annual_ctc?: number | null;
    department_id?: number | null;
    team_id?: number | null;
}

export interface EmployeeEducationEntry {
    degree?: string;
    field?: string;
    institution?: string;
    year?: string | number;
    grade?: string;
}

export interface EmployeeExperienceEntry {
    jobTitle?: string;
    job_title?: string;
    company?: string;
    startDate?: string | null;
    start_date?: string | null;
    endDate?: string | null;
    end_date?: string | null;
    isCurrent?: boolean;
    is_current?: boolean;
    current?: boolean;
    description?: string;
}

export interface EmployeeEmergencyContactEntry {
    name: string;
    relationship: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    is_primary?: boolean;
}

/**
 * Mapping from request camelCase payload keys to DB snake_case column names.
 */
const PROFILE_FIELD_MAP: Record<string, string> = {
    name:                 'name',
    email:                'email',
    department:           'department',
    position:             'position',
    status:               'status',
    location:             'location',
    phone:                'phone',
    gender:               'gender',
    personalEmail:        'personal_email',
    personal_email:       'personal_email',
    dateOfBirth:          'date_of_birth',
    date_of_birth:        'date_of_birth',
    joinDate:             'join_date',
    join_date:            'join_date',
    bloodGroup:           'blood_group',
    blood_group:          'blood_group',
    maritalStatus:        'marital_status',
    marital_status:       'marital_status',
    nationality:          'nationality',
    addressLine1:         'address_line1',
    address_line1:        'address_line1',
    addressLine2:         'address_line2',
    address_line2:        'address_line2',
    city:                 'city',
    state:                'state',
    pincode:              'pincode',
    employmentType:       'employment_type',
    employment_type:      'employment_type',
    probationEndDate:     'probation_end_date',
    probation_end_date:   'probation_end_date',
    confirmationDate:     'confirmation_date',
    confirmation_date:    'confirmation_date',
    noticePeriodDays:     'notice_period_days',
    notice_period_days:   'notice_period_days',
    exitDate:             'exit_date',
    exit_date:            'exit_date',
    exitReason:           'exit_reason',
    exit_reason:          'exit_reason',
    exitType:             'exit_type',
    exit_type:            'exit_type',
    lastWorkingDay:       'last_working_day',
    last_working_day:     'last_working_day',
    departmentId:         'department_id',
    department_id:        'department_id',
    teamId:               'team_id',
    team_id:              'team_id',
    reportingManagerId:   'reporting_manager_id',
    reporting_manager_id: 'reporting_manager_id',
    highestDegree:        'highest_degree',
    highest_degree:       'highest_degree',
    fieldOfStudy:         'field_of_study',
    field_of_study:       'field_of_study',
    institution:          'institution',
    graduationYear:       'graduation_year',
    graduation_year:      'graduation_year',
    internshipStartDate:  'internship_start_date',
    internship_start_date:'internship_start_date',
    internshipEndDate:    'internship_end_date',
    internship_end_date:  'internship_end_date',
    internshipStipend:    'internship_stipend',
    internship_stipend:   'internship_stipend',
    internshipSupervisor: 'internship_supervisor',
    internship_supervisor:'internship_supervisor',
    internshipCollege:    'internship_college',
    internship_college:   'internship_college',
    educationHistory:     'education_history',
    education_history:    'education_history',
    experienceHistory:    'experience_history',
    experience_history:   'experience_history',
    bankAccountNumber:    'bank_account_number',
    bank_account_number:  'bank_account_number',
    annualCTC:            'annual_ctc',
    annual_ctc:           'annual_ctc',
    taxRegime:            'tax_regime',
    tax_regime:           'tax_regime',
    avatarUrl:            'avatar_url',
    avatar_url:           'avatar_url',
};

/**
 * Whitelist of actual DB columns in `employees` table.
 * Crucial: Non-employee fields like 'role', 'role_id', 'reportingManagerName'
 * will NEVER be included in employee profile SQL queries.
 */
const VALID_EMPLOYEE_COLUMNS = new Set<string>(Object.values(PROFILE_FIELD_MAP));

/**
 * Extracts and sanitizes employee profile fields strictly targeting the employees table.
 */
export function extractEmployeeProfileUpdates(payload: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(payload)) {
        const dbColumn = PROFILE_FIELD_MAP[key];
        if (dbColumn && VALID_EMPLOYEE_COLUMNS.has(dbColumn)) {
            // Nullify empty strings for database hygiene
            sanitized[dbColumn] = value === '' ? null : value;
        }
    }

    return sanitized;
}

/**
 * Extracts user account attributes (users and roles submodel).
 */
export function extractEmployeeUserUpdates(payload: Record<string, any>): EmployeeUserSubmodel {
    return {
        email: payload.email?.trim() || undefined,
        role: payload.role?.trim() || undefined,
        avatarUrl: payload.avatarUrl || payload.avatar_url || undefined,
    };
}

/**
 * Extracts compensation attributes (payroll_profiles submodel).
 */
export function extractEmployeePayrollUpdates(payload: Record<string, any>): EmployeePayrollSubmodel {
    const annualCTC = payload.annualCTC !== undefined ? Number(payload.annualCTC) : (payload.annual_ctc !== undefined ? Number(payload.annual_ctc) : undefined);
    const departmentId = payload.departmentId !== undefined ? (payload.departmentId ? Number(payload.departmentId) : null) : (payload.department_id !== undefined ? (payload.department_id ? Number(payload.department_id) : null) : undefined);
    const teamId = payload.teamId !== undefined ? (payload.teamId ? Number(payload.teamId) : null) : (payload.team_id !== undefined ? (payload.team_id ? Number(payload.team_id) : null) : undefined);

    return {
        name: payload.name?.trim() || undefined,
        department: payload.department !== undefined ? payload.department : undefined,
        position: payload.position !== undefined ? payload.position : undefined,
        role: payload.role !== undefined ? payload.role : undefined,
        annual_ctc: isNaN(annualCTC as number) ? undefined : annualCTC,
        department_id: departmentId,
        team_id: teamId,
    };
}
