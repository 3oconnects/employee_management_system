import { AppError } from '../errors/AppError';
import { hasAccess, hasDashboardAdminBypass, isSuperAdminIdentity } from './authorize';
import { AuthzStateRepository, RoleRecord, UserAuthzRecord } from './authzState.repository';

// ============================================================================
// AUTHORIZATION-STATE POLICY (HF-10)
//
// One place that decides who may change authorization state: which role a user holds, what a role is
// allowed to do, who may act on whom. Used by settings users, settings roles/permissions, employee
// create / update / bulk upload.
//
// The rule is not "is the actor an admin". It is:
//   an actor may only grant, assign or act on authorization that the actor is itself authorized to grant,
//   i.e. the target's effective permissions are a subset of the actor's, inside the actor's tenant;
//   the super-admin identity can be assigned or touched only by a super admin.
//
// TEMPORARY COMPATIBILITY: the two legacy "unbounded" identities (super_admin, dashboard_type=admin)
// are read through isSuperAdminIdentity()/hasDashboardAdminBypass() in authorize.ts, the same helpers
// hasAccess() uses. HF-9A deletes both bypasses; this module then needs no change except those imports.
// ============================================================================

export interface AuthzActor {
    userId: number;
    email: string;
    tenantId: string;
    role?: string;
    dashboard_type?: string;
    permissions?: string[];
}

/** Permissions that gate changing authorization state (seeded to whoever holds settings:manage). */
export const AUTHZ_STATE_PERMISSIONS = ['roles:assign', 'roles:manage', 'permissions:grant', 'users:manage'] as const;

/** Names no tenant may create or rename a role to. Rejection list, not an authorization rule. */
export const RESERVED_ROLE_NAMES: ReadonlySet<string> = new Set(['super_admin']);

export const ALLOWED_DASHBOARD_TYPES: ReadonlySet<string> = new Set(['admin', 'manager', 'employee']);

type Grade = 'super' | 'unbounded' | 'ordinary';

/** How much a subject can do: the super identity, a legacy full-bypass identity, or only its listed permissions. */
const gradeOf = (s: { role?: string | null; dashboard_type?: string | null }): Grade => {
    const subject = { role: s.role ?? undefined, dashboard_type: s.dashboard_type ?? undefined };
    if (isSuperAdminIdentity(subject)) return 'super';
    if (hasDashboardAdminBypass(subject)) return 'unbounded';
    return 'ordinary';
};

const isReservedName = (name: string): boolean => RESERVED_ROLE_NAMES.has(name.trim().toLowerCase());

const store = new AuthzStateRepository();

/** `subject` may be affected by `actor` only if the actor's authority covers it. */
function actorCovers(actor: AuthzActor, subject: { grade: Grade; permissions: string[] }): boolean {
    const actorGrade = gradeOf(actor);
    if (subject.grade === 'super') return actorGrade === 'super';
    if (actorGrade !== 'ordinary') return true; // super or legacy-unbounded actor, subject below super
    if (subject.grade === 'unbounded') return false;
    const held = new Set(actor.permissions || []);
    return subject.permissions.every((p) => held.has(p));
}

const roleSubject = (role: RoleRecord) => ({ grade: gradeOf({ role: role.name, dashboard_type: role.dashboard_type }), permissions: role.permissions });
const userSubject = (u: UserAuthzRecord) => ({ grade: gradeOf({ role: u.role_name, dashboard_type: u.dashboard_type }), permissions: u.permissions });

const CANNOT_GRANT = 'You cannot grant or change authorization that you do not hold yourself.';

export type RoleRef = { roleId?: number | string | null; roleName?: string | null };

/** Resolve a role reference to a role the caller's tenant can see. `role_id` wins over a name; a name is only a lookup key. */
export async function resolveVisibleRole(actor: AuthzActor, ref: RoleRef): Promise<RoleRecord> {
    const idRaw = ref.roleId;
    let role: RoleRecord | null = null;
    if (idRaw !== undefined && idRaw !== null && String(idRaw) !== '') {
        const id = Number(idRaw);
        if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest('Invalid role.');
        role = await store.findVisibleRoleById(id, actor.tenantId);
    } else if (ref.roleName && ref.roleName.trim()) {
        role = await store.findVisibleRoleByName(ref.roleName, actor.tenantId);
    } else {
        throw AppError.badRequest('A role is required.');
    }
    if (!role) throw AppError.notFound('Role'); // another tenant's role is indistinguishable from a missing one
    return role;
}

/** The actor's authority must cover everything the role can do. */
export function assertActorCoversRole(actor: AuthzActor, role: RoleRecord): void {
    if (!actorCovers(actor, roleSubject(role))) throw AppError.forbidden(CANNOT_GRANT);
}

/** The actor may act on this existing user (password, status, e-mail, role...) only if it covers the user's current authority. */
export async function assertMayManageUser(actor: AuthzActor, targetUserId: number): Promise<UserAuthzRecord> {
    const target = await store.findUserAuthz(Number(targetUserId), actor.tenantId);
    if (!target) throw AppError.notFound('User');
    if (!actorCovers(actor, userSubject(target))) {
        throw AppError.forbidden('You cannot manage an account that holds more authority than you.');
    }
    return target;
}

/**
 * Assign a role to an existing user (`targetUserId`) or to one being created (`null`).
 * Needs roles:assign; the role must be visible to the tenant and covered by the actor; never to yourself.
 */
export async function assertMayAssignRole(actor: AuthzActor, targetUserId: number | null, ref: RoleRef): Promise<RoleRecord> {
    if (!hasAccess(actor, ['roles:assign'])) throw AppError.forbidden('You do not have permission to assign roles.');
    if (targetUserId !== null && Number(targetUserId) === actor.userId) {
        throw AppError.forbidden('You cannot change your own role.');
    }
    if (targetUserId !== null) await assertMayManageUser(actor, targetUserId);
    const role = await resolveVisibleRole(actor, ref);
    assertActorCoversRole(actor, role);
    return role;
}

/**
 * The baseline role is what every employee of the organization holds, so giving it to a new account is not
 * an escalation and needs neither roles:assign nor holding each of its permissions. If the baseline has been
 * made a bypass role (super / dashboard admin), it is no longer a baseline and the full coverage rule applies.
 */
export async function resolveBaselineRole(actor: AuthzActor, baselineName: string): Promise<RoleRecord> {
    const role = await store.findVisibleRoleByName(baselineName, actor.tenantId);
    if (!role) throw AppError.badRequest('The default role is not configured for this organization.');
    if (roleSubject(role).grade !== 'ordinary') assertActorCoversRole(actor, role);
    return role;
}

/**
 * Role for a new login account created through the employee flow.
 * No role named, or the named role IS the baseline: no roles:assign needed (the actor must still cover it).
 * Any other role: the full assignment rules apply. A role is never created here.
 */
export async function resolveRoleForNewAccount(actor: AuthzActor, ref: RoleRef, baselineName: string): Promise<RoleRecord> {
    const named = (ref.roleId !== undefined && ref.roleId !== null && String(ref.roleId) !== '')
        || (typeof ref.roleName === 'string' && ref.roleName.trim() !== '');
    const baseline = await resolveBaselineRole(actor, baselineName);
    if (!named) return baseline;
    const requested = await resolveVisibleRole(actor, ref); // 404 for a missing or other-tenant role
    if (requested.id === baseline.id) return baseline;
    return assertMayAssignRole(actor, null, ref);
}

/** The caller-tenant user who owns this login e-mail, if any (no authorization decision here). */
export async function findTenantUserByEmail(actor: AuthzActor, email: string): Promise<UserAuthzRecord | null> {
    return store.findUserAuthzByEmail(email, actor.tenantId);
}

export interface NewRoleInput { name?: string; dashboard_type?: string; permissions?: string[] }

/** Validate a permission list: every entry must exist, and the actor must hold each one it grants. */
async function assertGrantablePermissions(actor: AuthzActor, requested: string[]): Promise<void> {
    const keys = [...new Set((requested || []).map((p) => String(p).trim()).filter(Boolean))];
    const bad = keys.filter((k) => !/^[a-z_]+:[a-z_]+$/.test(k));
    if (bad.length) throw AppError.badRequest(`Unknown permission: ${bad[0]}`);
    const found = await store.existingPermissions(keys);
    const unknown = keys.find((k) => !found.has(k));
    if (unknown) throw AppError.badRequest(`Unknown permission: ${unknown}`);
    if (gradeOf(actor) !== 'ordinary') return;
    const held = new Set(actor.permissions || []);
    if (keys.some((k) => !held.has(k))) throw AppError.forbidden(CANNOT_GRANT);
}

/** dashboard_type is validated; "admin" is a full bypass, so setting it is a grant of everything. */
function assertMayUseDashboardType(actor: AuthzActor, dashboardType: string | null | undefined): void {
    if (dashboardType === undefined || dashboardType === null) return;
    if (!ALLOWED_DASHBOARD_TYPES.has(String(dashboardType))) throw AppError.badRequest('Invalid dashboard type.');
    if (hasDashboardAdminBypass({ dashboard_type: String(dashboardType) }) && gradeOf(actor) === 'ordinary') {
        throw AppError.forbidden(CANNOT_GRANT);
    }
}

export async function assertMayCreateRole(actor: AuthzActor, input: NewRoleInput): Promise<void> {
    if (!hasAccess(actor, ['roles:manage'])) throw AppError.forbidden('You do not have permission to manage roles.');
    if (!input.name || !input.name.trim()) throw AppError.badRequest('Role name is required.');
    if (isReservedName(input.name)) throw AppError.badRequest('That role name is reserved.');
    assertMayUseDashboardType(actor, input.dashboard_type);
    await assertGrantablePermissions(actor, input.permissions || []);
}

/** A role the actor's own tenant owns (shared templates are read-only), that the actor covers. */
async function loadOwnedRole(actor: AuthzActor, roleId: number | string): Promise<RoleRecord> {
    const role = await resolveVisibleRole(actor, { roleId });
    if (role.tenant_id !== actor.tenantId) throw AppError.notFound('Role'); // shared template: not yours to edit
    assertActorCoversRole(actor, role);
    return role;
}

export async function assertMayModifyRole(actor: AuthzActor, roleId: number | string, changes: { name?: string | null; dashboard_type?: string | null }): Promise<RoleRecord> {
    if (!hasAccess(actor, ['roles:manage'])) throw AppError.forbidden('You do not have permission to manage roles.');
    const role = await loadOwnedRole(actor, roleId);
    if (changes.name && isReservedName(changes.name)) throw AppError.badRequest('That role name is reserved.');
    if (changes.dashboard_type !== undefined && changes.dashboard_type !== null) {
        assertMayUseDashboardType(actor, changes.dashboard_type);
    }
    return role;
}

export async function assertMayDeleteRole(actor: AuthzActor, roleId: number | string): Promise<RoleRecord> {
    if (!hasAccess(actor, ['roles:manage'])) throw AppError.forbidden('You do not have permission to manage roles.');
    return loadOwnedRole(actor, roleId);
}

/** Replace a role's permission set: each ADDED permission must be one the actor holds; the role itself must be covered. */
export async function assertMayGrantPermissions(actor: AuthzActor, roleId: number | string, newSet: string[]): Promise<RoleRecord> {
    if (!hasAccess(actor, ['permissions:grant'])) throw AppError.forbidden('You do not have permission to grant permissions.');
    const role = await loadOwnedRole(actor, roleId);
    await assertGrantablePermissions(actor, newSet);
    return role;
}
