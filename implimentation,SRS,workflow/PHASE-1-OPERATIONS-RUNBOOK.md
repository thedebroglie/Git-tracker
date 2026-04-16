# Phase 1 Operations Runbook (Health Checks)

## Purpose
Operational guidance for runtime health verification introduced in Phase 1.

## Endpoints
1. `GET /live`
   - Purpose: Process liveness signal.
   - Expected success: HTTP 200 with `status=alive`.

2. `GET /ready`
   - Purpose: Startup/dependency readiness signal.
   - Expected success: HTTP 200 with `status=ready`.
   - Expected degraded: HTTP 503 with `status=not_ready`.

3. `GET /health`
   - Purpose: Basic app metadata and uptime.
   - Expected success: HTTP 200 with timestamp and uptime.

## Structured Request Correlation
1. Every response includes `x-request-id` header.
2. Logs emit JSON with request metadata and duration.
3. Use request ID to correlate client errors with server logs.

## Quick Verification Commands (Windows PowerShell)
1. Liveness:
   - `curl.exe -i http://localhost:5001/live`
2. Readiness:
   - `curl.exe -i http://localhost:5001/ready`
3. Unknown route contract check:
   - `curl.exe -i http://localhost:5001/not-found`

## Readiness Interpretation
1. `checks.startupComplete=true`:
   - Core startup sequence finished.
2. `checks.mongoReady=true`:
   - MongoDB connection is available.
3. `checks.redisReady=false`:
   - Service can still run in degraded mode for local/dev, but queue scheduler may be skipped.

## Startup Validation Rules
1. App performs strict environment validation at boot.
2. Missing required env vars stop startup.
3. Weak/invalid security config stops startup.
4. Placeholder values:
   - Production: treated as startup error.
   - Non-production: logged as warning.

## Incident Notes
1. If `/ready` returns 503:
   - Check startup logs for `env_validation_failed` or DB connection errors.
   - Verify `MONGO_URI`, `JWT_SECRET`, and GitHub App env vars.
2. If request IDs are missing:
   - Check middleware order in `backend/server.js`.
3. If webhook replays are not suppressed:
   - Verify Redis availability or fallback store behavior in `backend/utils/ephemeralStore.js`.
