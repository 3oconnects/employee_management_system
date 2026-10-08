# Starts the EMS stack against a THROWAWAY LOCAL Postgres only, then runs the suite.
# Usage (PowerShell, from docs/audit/v2/e2e):
#   $env:E2E_LOCAL_DB_URL = 'postgresql://<user>:<pw>@localhost:5432/ems_audit_e2e'   # you provide this; never the Supabase URL
#   $env:E2E_SEED_PASSWORD = '<>=12 chars test value>'
#   ./scripts/run-local.ps1
# Prerequisite (once): create DB ems_audit_e2e, then
#   cd server; $env:STAGING_DB_URL=$env:E2E_LOCAL_DB_URL; $env:STAGING_SEED_PASSWORD=$env:E2E_SEED_PASSWORD;
#   $env:STAGING_CONFIRM_HOST='localhost'; npx tsx scripts/staging/rebuild.ts --i-understand-this-destroys-staging
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot/../../../../.."
if (-not $env:E2E_LOCAL_DB_URL) { throw 'E2E_LOCAL_DB_URL not set' }
if ($env:E2E_LOCAL_DB_URL -notmatch '@(localhost|127\.0\.0\.1)(:\d+)?/') { throw 'SAFETY: DB URL must be localhost' }
if (-not $env:E2E_SEED_PASSWORD) { throw 'E2E_SEED_PASSWORD not set' }

# Process env wins over server/.env (dotenv does not override already-set vars; EMPTY strings count as set).
$srv = @{
  DATABASE_URL = $env:E2E_LOCAL_DB_URL; DIRECT_URL = $env:E2E_LOCAL_DB_URL; DB_SSL_DISABLE = 'true'
  JWT_SECRET = 'e2e-test-access-secret-0123456789abcdef-A'; JWT_REFRESH_SECRET = 'e2e-test-refresh-secret-0123456789abcdef-B'
  GMAIL_USER = ''; GMAIL_APP_PASSWORD = ''; SMTP_HOST = ''; SMTP_USER = ''; SMTP_PASS = ''   # mail transport disabled
  APP_URL = 'http://localhost:5173'; SENTRY_DSN = ''; PORT = '4000'; NODE_ENV = 'development'
}
$srv.GetEnumerator() | ForEach-Object { Set-Item "env:$($_.Key)" $_.Value }
$api = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory "$root/server" -FilePath npx.cmd -ArgumentList 'tsx','src/index.ts'
$env:VITE_API_URL = 'http://localhost:4000/api/v1'
$web = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory "$root/client" -FilePath npx.cmd -ArgumentList 'vite','--port','5173','--strictPort'
try {
  1..40 | ForEach-Object { try { Invoke-RestMethod http://localhost:4000/api/v1/health | Out-Null; throw 'up' } catch { if ($_.ToString() -eq 'up') { return }; Start-Sleep 2 } }
  $env:E2E_API_URL = 'http://localhost:4000/api/v1'; $env:E2E_CLIENT_URL = 'http://localhost:5173'
  Push-Location "$root/docs/audit/v2/e2e"; npx playwright test; Pop-Location
} finally {
  Stop-Process -Id $api.Id, $web.Id -Force -ErrorAction SilentlyContinue
}
