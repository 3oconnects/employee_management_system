# Runbook — Backup & Restore Verification (Release 0 · B0-02)

**Owner:** database owner (Supabase project admin) · **Frequency:** once for Release 0, then quarterly, and after any backup-setting change.

A backup that has never been restored is an assumption, not a backup. Release 0 is not complete until this procedure has been performed once and recorded below with a PASS. Every later release changes auth, approvals and payroll data paths; this restore point is what makes those changes recoverable.

> **Never restore over production.** Every step below restores into a separate, scratch Supabase project.

---

## 1. Record the current backup configuration

In the Supabase dashboard → *Project Settings → Add-ons / Database → Backups*:

| Item | Value |
|---|---|
| Supabase plan / tier | |
| Daily backups enabled? | |
| Daily backup retention (days) | |
| Point-in-Time Recovery (PITR) enabled? | |
| PITR retention window | |
| Most recent backup timestamp | |
| Postgres major version | |

If daily backups are not available on the current tier, record that. It is itself a launch blocker, to be raised with the business before Release 1.

## 2. Proposed recovery targets (owner to approve)

| Target | Proposed (no PITR) | Proposed (with PITR) | Approved |
|---|---|---|---|
| **RPO**: maximum acceptable data loss | ≤ 24 h | ≤ 5 min | |
| **RTO**: maximum time to restore service | ≤ 4 h | ≤ 4 h | |

HR and payroll data changes slowly, but a lost payroll run or approval trail has legal weight. If the approved RPO is under 24 h, PITR is required.

## 3. Restore drill (into a scratch project)

1. Create a new Supabase project named `ems-restore-drill-YYYYMMDD`, in the same region and the same Postgres major version.
2. Restore:
   - **With PITR / dashboard restore-to-new-project:** use *Backups → Restore to a new project*, picking the most recent backup or a point in time.
   - **Without that feature:** download the latest daily backup from the dashboard, then restore it with `psql "$DRILL_DB_URL" -f <backup-file>` (or `pg_restore` for custom-format dumps). Use the drill project's connection string, set through a masked prompt as in `server/db/baseline/README.md` §2.
3. **Start a timer** at step 1 and stop it at the end of step 4. That duration is the **measured RTO**.
4. Verify the restore:
   - **Row counts:** run `server/db/baseline/diagnostics.sql` against the drill project. Compare section **1.2 (row counts)** with the B0-01 production output, which should match up to the backup's age.
   - **App check:** run the API locally against the drill DB and log in with an account you own:
     ```bash
     cd server
     DATABASE_URL="$DRILL_DB_URL" DIRECT_URL="$DRILL_DB_URL" SENTRY_DSN= npm run dev
     ```
     Log in through the client (`cd client && npm run dev`), open the employee list, open one payslip view and the approvals inbox. **Do not perform any write action** in the drill environment that could send email. Leave SMTP/Gmail variables empty.
5. **Measured RPO** = time of the restore drill's source backup → time of the most recent production change you can identify (e.g. `max(created_at)` of `audit_logs` in each, via a read-only query).
6. **Delete the drill project** afterwards. It contains a full copy of production personal data.

## 4. Results (fill in)

| Field | Value |
|---|---|
| Date | |
| Operator | |
| Restore method (PITR / daily / manual dump) | |
| Restore source timestamp | |
| Measured RTO (duration) | |
| Measured RPO (data age) | |
| Row counts match B0-01 (±backup age)? | |
| App login + read checks pass? | |
| Drill project deleted? (date) | |
| **Result** | PASS / FAIL |
| Notes / follow-ups | |

**Release 0 gate:** Result = PASS, and the targets in §2 are approved.

## 5. If the drill fails

- Do **not** proceed to Release 1.
- Record what failed (missing backup, version mismatch, restore error, data mismatch).
- Common fixes: enable PITR or upgrade the tier; take a manual `pg_dump` (data + schema) to encrypted storage owned by the company as an interim measure; re-run the drill.
