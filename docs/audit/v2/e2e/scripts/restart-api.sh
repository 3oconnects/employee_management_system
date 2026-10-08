#!/bin/bash
# Restarts the throwaway API (port 4100) to reset the in-memory authLimiter. Local DB only.
powershell.exe -NoProfile -Command "Get-NetTCPConnection -LocalPort 4100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }" >/dev/null 2>&1; sleep 1
cd "$(dirname "$0")/../../../../../server"
export DATABASE_URL=postgresql://e2e@127.0.0.1:55432/ems_audit_e2e DIRECT_URL=postgresql://e2e@127.0.0.1:55432/ems_audit_e2e DB_SSL_DISABLE=true JWT_SECRET=e2e-test-access-secret-0123456789abcdef-A JWT_REFRESH_SECRET=e2e-test-refresh-secret-0123456789abcdef-B GMAIL_USER= GMAIL_APP_PASSWORD= SMTP_HOST= SMTP_USER= SMTP_PASS= SENTRY_DSN= APP_URL=http://localhost:3000 PORT=4100
nohup node --import tsx src/index.ts > /tmp/api.log 2>&1 &
sleep 10; curl -s localhost:4100/api/v1/health | head -c 30
