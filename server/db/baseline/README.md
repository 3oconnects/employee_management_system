# B0-01 — Live Schema Baseline (owner runbook)

**Why:** the repository's schema scripts do not describe production. Code writes columns that no repo script creates, and `npm run db:migrate` cannot build a fresh database (see `0000_live_schema.md` once written, and baseline §0.2). From Release 0 onward, **the production schema snapshot is the single source of truth** for every migration, the test database and staging:

```text
Production DB → 0000_live_schema.sql → numbered migrations → staging → production
```

**Who runs this:** the database owner. The coding agent wrote these scripts but never connects to production and never sees credentials.

**What gets committed:**

| File | Content | Committed? |
|---|---|---|
| `diagnostics.sql` | Read-only, aggregate-only diagnostic queries | Yes (already) |
| `0000_live_schema.sql` | **Structural DDL only**, reviewed per §4 | Yes, after review |
| `0000_live_schema.md` | Inventory, drift table and aggregate diagnostics (written from your output) | Yes |
| `diagnostics_output.txt`, any raw dump | Raw local output | **Never.** Delete after hand-off (§5) |

---

## 1. Prerequisites

- PostgreSQL client tools (`pg_dump`, `psql`) at a version **≥ the server's major version**. Check the server version with `SELECT version();`; Supabase currently runs 15 or 17.
- A **direct** connection string (port `5432`), not the transaction pooler (`6543`). `pg_dump` does not work through transaction pooling.
- A read-only role (strongly recommended). Create it once in the Supabase SQL editor, using a generated password you keep in your password manager:

  ```sql
  CREATE ROLE ems_readonly LOGIN PASSWORD '<generate-a-strong-password>';
  GRANT CONNECT ON DATABASE postgres TO ems_readonly;
  GRANT USAGE ON SCHEMA public TO ems_readonly;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO ems_readonly;
  ALTER ROLE ems_readonly SET default_transaction_read_only = on;
  ```

  > **RLS caveat:** if diagnostics §1.2 reports `rls_enabled = t` for any table, a role without `BYPASSRLS` may see filtered row counts. In that case, re-run `diagnostics.sql` from the Supabase SQL editor as the owner role. The script is still read-only: it runs inside `BEGIN READ ONLY … ROLLBACK`. Note in the hand-off which role was used.

## 2. Set the connection variable (never echo it)

PowerShell:
```powershell
$env:PROD_DB_URL_READONLY = Read-Host -MaskInput "Read-only connection string"
```
bash:
```bash
read -rs -p "Read-only connection string: " PROD_DB_URL_READONLY; export PROD_DB_URL_READONLY; echo
```
Do not paste the URL into any file, chat, ticket or commit.

## 3. Run (from `server/db/baseline/`)

**Step 3.1: diagnostics first** (this also lists which schemas exist):
```bash
psql "$PROD_DB_URL_READONLY" -X -q -f diagnostics.sql -o diagnostics_output.txt
```
Read section **1.1 NON-SYSTEM SCHEMAS**. Application tables are normally only in `public`. If application tables appear in any other schema that is **not** Supabase-managed (`auth`, `storage`, `realtime`, `graphql`, `graphql_public`, `vault`, `extensions`, `pgsodium*`, `supabase_*`, `net`, `cron`), add `--schema=<name>` to the dump below and tell the implementer.

**Step 3.2: schema-only dump:**
```bash
pg_dump "$PROD_DB_URL_READONLY" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  --schema=public \
  -f 0000_live_schema.sql
```

## 4. Security review of `0000_live_schema.sql` (before committing)

Run these checks. **Each must print nothing**, except the last, which prints a single count.

```bash
grep -nE '^(COPY|INSERT)\b' 0000_live_schema.sql                                   # no data
grep -niE "password *[=:]|password +'|secret|apikey|api_key|postgres(ql)?://|sslkey|sslcert" 0000_live_schema.sql   # no credential values or URLs (a column named password is expected and not matched)
grep -nE '\b(auth|storage|realtime|vault|graphql|pgsodium|supabase_[a-z_]+)\.' 0000_live_schema.sql   # no Supabase-internal schemas
grep -nE 'OWNER TO|GRANT |REVOKE ' 0000_live_schema.sql                             # no role/owner info
grep -nE '@[a-z0-9.-]+\.[a-z]{2,}' 0000_live_schema.sql                             # no email addresses
grep -cE '^CREATE TABLE' 0000_live_schema.sql                                        # sanity: number of tables
```

Then:
- **Column defaults and CHECK constraints** can embed literal values. Skim every `DEFAULT '…'` and `CHECK (…)` for anything sensitive (real email domains, internal URLs, tokens).
- Lines starting with `\` (for example `\restrict`, added by newer `pg_dump`) are fine to keep. The test harness strips them.
- If anything had to be removed, note *what category* was removed (never the value) for `0000_live_schema.md`.

**`diagnostics_output.txt` review:** it should contain only structure (table, column, constraint and index names), counts and bucketed distributions. If you see any row-level personal data, stop and report it as a script defect. It should not be possible.

## 5. Hand-off and clean-up

1. Commit `0000_live_schema.sql` on the Release 0 branch (or give it to the implementer to commit).
2. Give the implementer the **contents** of `diagnostics_output.txt` through a private channel. The implementer transcribes the aggregates into `0000_live_schema.md`.
3. **Delete the raw files locally:**
   ```bash
   rm -f diagnostics_output.txt
   ```
   (`0000_live_schema.sql` stays, because it is the committed baseline.)
4. Unset the variable: `unset PROD_DB_URL_READONLY` (bash) or `Remove-Item Env:PROD_DB_URL_READONLY` (PowerShell).
5. Optional: drop the read-only role after Release 0 if it is no longer needed:
   `DROP ROLE ems_readonly;`

## 6. What happens next

- The implementer writes `0000_live_schema.md`: structural inventory, drift table (repo scripts vs live), all aggregate diagnostics, and the baseline §0.2–0.5 / A1-3 / A2-9 findings marked **confirmed** or **refuted**.
- B0-03 integration tests build their database from `0000_live_schema.sql` (`server/test/setup/integration.global.ts`).
- B0-05 rebuilds staging from it. **If the staging rebuild fails, the snapshot is incomplete and this runbook is repeated.**
