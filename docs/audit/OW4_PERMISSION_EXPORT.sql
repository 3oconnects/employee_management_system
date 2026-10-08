-- ============================================================================
-- OW-4 — PRODUCTION AUTHORIZATION EXPORT  (READ-ONLY)
--
-- Purpose: give the engineering side the effective role / permission / bypass picture of
-- production so HF-9A (removing the dashboard_type = 'admin' and role-name bypasses) can be
-- done without locking anyone out.
--
-- Run by the OWNER, against the production (or a fresh restore of production) database.
-- Claude does not run this and has no production access.
--
-- Safety:
--   * one READ ONLY transaction; every statement is a SELECT; it cannot change data
--   * no e-mail addresses, names, phone numbers, password hashes, tokens or temp passwords are selected
--   * only ids, tenant ids, role names, permission names and counts
--
-- How to run (psql), from the folder where you want the files:
--     psql "$PROD_DATABASE_URL" -v ON_ERROR_STOP=1 -f OW4_PERMISSION_EXPORT.sql > ow4_export.txt
-- Then send ow4_export.txt (it is plain text, safe to paste). If your client cannot run \echo
-- lines, delete them; they are only section headings.
-- ============================================================================
BEGIN TRANSACTION READ ONLY;

\echo '=== 0. COLUMNS THAT EXIST (is there a users.dashboard_type? is roles.dashboard_type there?) ==='
SELECT table_name, column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('users', 'roles', 'permissions', 'role_permissions', 'tenants')
   AND column_name IN ('id','tenant_id','name','role','role_id','dashboard_type','is_system','is_active','deleted_at','module','action','permission_id','status')
 ORDER BY table_name, column_name;

\echo '=== 1. TENANTS ==='
SELECT id, status, is_active, created_at FROM tenants ORDER BY created_at;

\echo '=== 2. PERMISSIONS (every row; both seeds should be visible here) ==='
SELECT id, module || ':' || action AS permission FROM permissions ORDER BY module, action;

\echo '=== 3. ROLES (with how many ACTIVE, non-deleted users hold each) ==='
SELECT r.id, r.tenant_id, r.name, COALESCE(r.is_system, false) AS is_system, r.dashboard_type,
       COUNT(u.id) FILTER (WHERE u.is_active AND u.deleted_at IS NULL) AS active_users
  FROM roles r LEFT JOIN users u ON u.role_id = r.id
 GROUP BY r.id ORDER BY r.tenant_id NULLS FIRST, r.id;

\echo '=== 4. ROLE -> PERMISSIONS (one line per role) ==='
SELECT r.id AS role_id, r.tenant_id, r.name, r.dashboard_type,
       COUNT(rp.permission_id) AS permission_count,
       COALESCE(string_agg(p.module || ':' || p.action, ', ' ORDER BY p.module, p.action), '(none)') AS permissions
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
 GROUP BY r.id ORDER BY r.tenant_id NULLS FIRST, r.id;

\echo '=== 5. EFFECTIVE ROLE PER USER, exactly as login resolves it: COALESCE(users.role_id, 4)  (no personal data) ==='
SELECT u.id AS user_id, u.tenant_id AS user_tenant, u.role AS legacy_role_string, u.role_id AS stored_role_id,
       COALESCE(u.role_id, 4) AS effective_role_id, r.name AS effective_role_name, r.tenant_id AS role_tenant,
       r.dashboard_type, u.is_active, (u.deleted_at IS NOT NULL) AS deleted
  FROM users u LEFT JOIN roles r ON r.id = COALESCE(u.role_id, 4)
 ORDER BY u.tenant_id, u.id;

\echo '=== 6. WHO PASSES EVERY CHECK TODAY (super_admin by role name, or dashboard_type = admin) ==='
SELECT r.id AS role_id, r.tenant_id AS role_tenant, r.name AS role_name, r.dashboard_type,
       CASE WHEN LOWER(r.name) = 'super_admin' THEN 'super_admin name' ELSE 'dashboard_type=admin' END AS bypass_reason,
       COUNT(u.id) FILTER (WHERE u.is_active AND u.deleted_at IS NULL) AS active_users,
       COUNT(rp.permission_id) AS explicit_permissions
  FROM roles r
  LEFT JOIN users u ON COALESCE(u.role_id, 4) = r.id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
 WHERE LOWER(r.name) = 'super_admin' OR LOWER(COALESCE(r.dashboard_type, '')) = 'admin'
 GROUP BY r.id ORDER BY active_users DESC;

\echo '=== 7. ANOMALIES THAT CHANGE WHAT HF-9A / HF-9B MUST DO ==='
\echo '--- 7a. users whose role belongs to ANOTHER tenant (login joins roles without a tenant filter)'
SELECT u.id AS user_id, u.tenant_id AS user_tenant, r.id AS role_id, r.tenant_id AS role_tenant, r.name
  FROM users u JOIN roles r ON r.id = COALESCE(u.role_id, 4)
 WHERE r.tenant_id IS DISTINCT FROM u.tenant_id
   AND r.tenant_id NOT IN ('tenant_default', 'default');
\echo '--- 7b. users resolving to a SHARED template role (tenant_default / default / NULL)'
SELECT r.tenant_id AS role_tenant, r.name, COUNT(*) AS users
  FROM users u JOIN roles r ON r.id = COALESCE(u.role_id, 4)
 WHERE r.tenant_id IN ('tenant_default', 'default') OR r.tenant_id IS NULL
 GROUP BY r.tenant_id, r.name ORDER BY users DESC;
\echo '--- 7c. users with NULL role_id (they silently get role id 4)'
SELECT COUNT(*) AS users_with_null_role_id FROM users WHERE role_id IS NULL;
\echo '--- 7d. users whose role_id points at a role that does not exist'
SELECT COUNT(*) AS users_with_dangling_role_id
  FROM users u LEFT JOIN roles r ON r.id = COALESCE(u.role_id, 4) WHERE r.id IS NULL;
\echo '--- 7e. roles whose NAME looks like an admin/owner role but dashboard_type is not admin (and vice versa)'
SELECT id, tenant_id, name, dashboard_type
  FROM roles
 WHERE (LOWER(name) LIKE '%admin%' OR LOWER(name) LIKE '%owner%') AND LOWER(COALESCE(dashboard_type,'')) <> 'admin'
    OR (LOWER(COALESCE(dashboard_type,'')) = 'admin' AND LOWER(name) NOT LIKE '%admin%' AND LOWER(name) NOT LIKE '%owner%')
 ORDER BY tenant_id, id;
\echo '--- 7f. admin-bypass roles that hold FEWER than 10 explicit permissions (these depend on the bypass today)'
SELECT r.id, r.tenant_id, r.name, COUNT(rp.permission_id) AS explicit_permissions
  FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id
 WHERE LOWER(COALESCE(r.dashboard_type,'')) = 'admin' OR LOWER(r.name) = 'super_admin'
 GROUP BY r.id HAVING COUNT(rp.permission_id) < 10 ORDER BY explicit_permissions;

\echo '=== 8. WHICH ROLES HOLD THE PERMISSIONS THE HF-4 / HF-5 / HF-10 CODE CHECKS ==='
SELECT p.module || ':' || p.action AS permission,
       COALESCE(string_agg(r.tenant_id || '/' || r.name, ', ' ORDER BY r.tenant_id, r.name), '(no role holds it)') AS held_by_roles
  FROM (VALUES
        ('leave','approve'), ('timesheet','approve'), ('claims','approve'), ('onboarding','manage'),
        ('organization','manage'), ('employees','manage'), ('employees','view'), ('employees','read'),
        ('settings','manage'), ('approvals','approve'), ('attendance','regularize'), ('attendance','manage'),
        ('payroll','view'), ('payroll','manage'), ('payroll','run'), ('payroll','view_own'),
        ('audit','view'), ('audit','read'), ('reports','view'),
        ('roles','assign'), ('roles','manage'), ('permissions','grant'), ('users','manage')
       ) AS wanted(module, action)
  LEFT JOIN permissions p ON p.module = wanted.module AND p.action = wanted.action
  LEFT JOIN role_permissions rp ON rp.permission_id = p.id
  LEFT JOIN roles r ON r.id = rp.role_id
 GROUP BY wanted.module, wanted.action, p.module, p.action
 ORDER BY wanted.module, wanted.action;

\echo '=== 9. CONSTRAINTS (is users.email really unique? is (tenant_id, name) unique on roles?) ==='
SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
  FROM pg_constraint
 WHERE conrelid IN ('users'::regclass, 'roles'::regclass, 'role_permissions'::regclass, 'permissions'::regclass)
   AND contype IN ('u', 'p')
 ORDER BY 1, 2;

\echo '=== 10. DEPARTMENT HEALTH REPORT for the future department workspaces (counts only, no personal data) ==='
SELECT e.tenant_id,
       COUNT(*)                                                              AS employees,
       COUNT(*) FILTER (WHERE e.department_id IS NULL)                       AS department_id_null,
       COUNT(*) FILTER (WHERE e.department_id IS NOT NULL AND d.id IS NULL)  AS department_id_invalid,
       COUNT(*) FILTER (WHERE d.id IS NOT NULL
                          AND LOWER(TRIM(COALESCE(e.department, ''))) <> LOWER(TRIM(d.name))) AS department_text_mismatch,
       COUNT(*) FILTER (WHERE e.user_id IS NULL)                             AS without_user_id
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
 WHERE e.deleted_at IS NULL
 GROUP BY e.tenant_id ORDER BY e.tenant_id;

ROLLBACK;  -- nothing was changed; the transaction is closed without committing
