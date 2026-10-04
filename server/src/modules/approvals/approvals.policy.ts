// ============================================================================
// APPROVAL POLICY (HF-4). Pure rules, no I/O, so they are easy to test and review.
// ============================================================================
// The unified inbox lists several kinds of request under prefixed ids. What an actor may
// do is decided from the REAL record (found by id, in the actor's own tenant), never from
// the `type` the client claims. The client's `type` must merely agree with the record.

export type ApprovalKind = 'std' | 'leave' | 'onboarding' | 'timesheet' | 'claim';

const PREFIXES: Array<[string, ApprovalKind]> = [
    ['std-', 'std'],
    ['leave-', 'leave'],
    ['onb-', 'onboarding'],
    ['ts-', 'timesheet'],
    ['claim-', 'claim'],
];

/** The inbox id always carries its kind (`leave-12`, `std-STR-1700…`). Anything else is invalid. */
export function parseApprovalId(raw: string): { kind: ApprovalKind; id: string } | null {
    for (const [prefix, kind] of PREFIXES) {
        if (raw.startsWith(prefix)) {
            const id = raw.slice(prefix.length);
            return id ? { kind, id } : null;
        }
    }
    return null;
}

/** For kinds backed by their own table, the approval type is implied by the kind. */
export const TYPE_OF_KIND: Record<Exclude<ApprovalKind, 'std'>, string> = {
    leave: 'leave',
    onboarding: 'onboarding',
    timesheet: 'timesheet',
    claim: 'claim',
};

/** Permission(s), any of which allows deciding a request of this type. */
const PERMISSIONS_BY_TYPE: Record<string, string[]> = {
    leave: ['leave:approve'],
    timesheet: ['timesheet:approve'],
    claim: ['claims:approve'],
    onboarding: ['onboarding:manage'],
    // same set that already guards creating/editing departments and teams
    department_creation: ['organization:manage', 'employees:manage'],
    team_creation: ['organization:manage', 'employees:manage'],
    // legacy password-reset approvals can no longer authorise anything (HF-3), but anyone
    // who can still action one must be a settings administrator
    password_reset: ['settings:manage'],
    // HF-5: a regularization is a request that someone else must approve before attendance changes
    attendance_regularization: ['attendance:regularize', 'attendance:manage'],
};
const GENERIC_PERMISSIONS = ['approvals:approve'];

export const permissionsForType = (type: string): string[] => PERMISSIONS_BY_TYPE[type] ?? GENERIC_PERMISSIONS;

/** Anyone who can decide at least one kind of request. Used as the cheap route-level gate. */
export const ANY_APPROVER_PERMISSIONS: string[] = Array.from(
    new Set([...Object.values(PERMISSIONS_BY_TYPE).flat(), ...GENERIC_PERMISSIONS]),
);

/** Statuses from which a request may still be decided, by kind. Anything else is a 409. */
export const PENDING_STATUSES: Record<ApprovalKind, string[]> = {
    std: ['pending'],
    leave: ['pending', 'pending_audit'],
    onboarding: ['onboarding', 'pending'],
    timesheet: ['submitted'],
    claim: ['pending'],
};

/** The status each decision writes (onboarding activates the employee). */
export const decisionStatus = (kind: ApprovalKind, action: 'approve' | 'reject'): string =>
    action === 'approve' ? (kind === 'onboarding' ? 'active' : 'approved') : 'rejected';

/** Types that have their own workflow and table, so they cannot be minted via POST /approvals. */
export const RESERVED_TYPES = new Set([
    'password_reset', 'leave', 'timesheet', 'claim', 'onboarding', 'department_creation', 'team_creation',
    'attendance_regularization',
]);

export interface Actor {
    userId: number | string;
    email: string;
    employeeId: string | null;
}

const same = (a: unknown, b: unknown): boolean =>
    a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);

/**
 * True when the actor is the requester or the subject of the request. Both the new
 * (user_id) and legacy (employee_id) identifiers are checked, because the tables hold both.
 */
export function isOwnRequest(kind: ApprovalKind, row: Record<string, any>, actor: Actor): boolean {
    const asUser = same(row.user_id, actor.userId);
    const asEmployee = same(row.employee_id, actor.employeeId);
    switch (kind) {
        case 'leave':
        case 'timesheet':
            return asUser || asEmployee;
        case 'claim':
            return asEmployee;
        case 'onboarding': // the row IS the employee
            return same(row.id, actor.employeeId) || asUser ||
                (!!row.email && row.email.toLowerCase() === actor.email.toLowerCase());
        case 'std': {
            const requester = String(row.requested_by ?? '').toLowerCase();
            return asEmployee ||
                (requester !== '' &&
                    [actor.email, String(actor.userId), actor.employeeId ?? ''].some(
                        (v) => v !== '' && v.toLowerCase() === requester));
        }
    }
}
