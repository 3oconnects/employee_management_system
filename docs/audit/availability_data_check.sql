-- ============================================================================
-- AVAILABILITY STATUS — DATA CHECK  (READ-ONLY; ids and counts only, no names or e-mails)
--
-- A person's availability is stored on their LOGIN (users.availability_status) and shown on their
-- employee profile by matching e-mail. The only data condition that makes two profiles show the same
-- status is two employee rows sharing one login e-mail. This script finds it.
--
-- Run:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f availability_data_check.sql
-- ============================================================================
BEGIN TRANSACTION READ ONLY;

\echo '=== 1. employee rows that share ONE login e-mail (these mirror each other''s status) ==='
SELECT e.tenant_id, COUNT(*) AS employee_rows, array_agg(e.id ORDER BY e.id) AS employee_ids
  FROM employees e
 WHERE e.deleted_at IS NULL AND e.email IS NOT NULL AND TRIM(e.email) <> ''
 GROUP BY LOWER(e.email), e.tenant_id
HAVING COUNT(*) > 1
 ORDER BY employee_rows DESC;

\echo '=== 2. login accounts whose e-mail differs only by letter case (the unique index does not stop these) ==='
SELECT COUNT(*) AS accounts, array_agg(u.id ORDER BY u.id) AS user_ids
  FROM users u
 WHERE u.deleted_at IS NULL
 GROUP BY LOWER(u.email)
HAVING COUNT(*) > 1;

\echo '=== 3. employee rows with no login (their status is always the default) ==='
SELECT e.tenant_id, COUNT(*) AS employees_without_login
  FROM employees e
  LEFT JOIN users u ON u.email = e.email AND u.tenant_id = e.tenant_id
 WHERE e.deleted_at IS NULL AND u.id IS NULL
 GROUP BY e.tenant_id;

\echo '=== 4. what statuses are stored right now ==='
SELECT availability_status, COUNT(*) AS accounts FROM users WHERE deleted_at IS NULL GROUP BY availability_status ORDER BY accounts DESC;

ROLLBACK;
