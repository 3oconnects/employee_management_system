// ============================================================================
// WHO MAY SEE WHAT ON SOMEONE ELSE'S PROFILE. Pure rules, no I/O.
// ============================================================================
// Viewing a profile needs `employees:view` (checked before this runs). That alone gives the WORK card:
// name, role, department, manager, work e-mail/phone, join date, availability, and the leave/attendance
// summaries a manager needs. Everything more private is a separate grant:
//   personal records (birth date, gender, address, education, experience, emergency contacts,
//   documents, reviews)               -> the owner, or `employees:update` / `employees:manage`
//   pay (CTC, bank account, payroll)  -> the owner, or `payroll:view` / `payroll:manage`
// The same flags are returned to the screen as `access`, so it can hide what the server withheld.

import { hasAccess } from '../../core/security/authorize';

type Actor = { role?: string; dashboard_type?: string; permissions?: string[] };

export interface ProfileAccess {
    /** this is the viewer's own profile */
    own: boolean;
    /** may read personal records */
    personal: boolean;
    /** may read pay details */
    pay: boolean;
    /** may change this profile (mirrors the write routes: the owner, or an administrator / HR) */
    edit: boolean;
}

// TEMPORARY: the write routes still decide "administrator / HR" by role name (HF-9B replaces that).
// Kept identical here so the screen never offers an edit that the server would refuse.
const WRITE_ROLES = ['admin', 'super_admin', 'hr'];

// Two permission vocabularies exist (schema.ts: employees:update, seedPermissions.ts: employees:manage); an HR role may hold either.
const PERSONAL_GRANTS = ['employees:update', 'employees:manage'];

export function profileAccess(actor: Actor, own: boolean): ProfileAccess {
    if (own) return { own: true, personal: true, pay: true, edit: true };
    return {
        own: false,
        personal: hasAccess(actor, PERSONAL_GRANTS),
        pay: hasAccess(actor, ['payroll:view', 'payroll:manage']),
        edit: WRITE_ROLES.includes((actor.role || '').toLowerCase()),
    };
}

const PERSONAL_FIELDS = [
    'personal_email', 'date_of_birth', 'gender', 'address_line1', 'city', 'state', 'pincode',
    'highest_degree', 'field_of_study', 'institution', 'graduation_year',
];
const PAY_FIELDS = ['bank_account_number', 'annual_ctc'];

/** Returns a copy of an employee profile (analyticsService.getEmployeeProfile) with what `access` does not allow removed. */
export function applyProfileAccess<T extends Record<string, any>>(profile: T, access: ProfileAccess): T & { access: ProfileAccess } {
    const out: Record<string, any> = { ...profile, access };
    if (out.employee) {
        const emp = { ...out.employee };
        if (!access.personal) for (const f of PERSONAL_FIELDS) delete emp[f];
        if (!access.pay) for (const f of PAY_FIELDS) delete emp[f];
        out.employee = emp;
    }
    if (!access.pay) out.compensation = null;
    if (!access.personal) {
        out.documents = [];
        out.emergencyContacts = [];
        out.performanceReviews = [];
    }
    return out as T & { access: ProfileAccess };
}
