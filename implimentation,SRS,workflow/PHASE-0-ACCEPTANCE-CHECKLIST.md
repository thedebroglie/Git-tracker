# Phase 0 Acceptance Checklist

Date: 2026-04-16
Owner: Backend Team
Status: Completed

## Scope
This checklist validates Phase 0 handoff items:
1. MongoDB retained as architecture baseline.
2. GitHub App installation flow foundation exists.
3. Webhook receiver validates signatures.
4. Webhook delivery idempotency is enforced.

## Preconditions
1. Backend environment configured using [backend/.env.example](backend/.env.example).
2. MongoDB and Redis are reachable.
3. Backend server runs locally.

## Checklist
- [x] Decision lock documented in [PHASE-0-DECISION-RECORD.md](PHASE-0-DECISION-RECORD.md).
- [x] SRS aligned in [PROJECT-WORKFLOW-SRS.md](PROJECT-WORKFLOW-SRS.md).
- [x] Student model contains GitHub App fields in [backend/models/Student.js](backend/models/Student.js).
- [x] App install URL endpoint exists: GET /auth/github/app/install.
- [x] App callback endpoint exists: GET /auth/github/app/callback.
- [x] Webhook endpoint exists: POST /api/webhooks/github.
- [x] Webhook rejects invalid signature.
- [x] Duplicate webhook delivery is ignored.

## Verification Results (Executed)
1. INSTALL_URL_OK: True
2. CALLBACK_MAPPED: {"githubAppInstalled":true,"githubAppInstallationId":"123456","githubAppSetupAction":"install"}
3. INVALID_SIGNATURE_STATUS: 401
4. VALID_WEBHOOK_STATUS: 200, body status ok
5. DUPLICATE_WEBHOOK_STATUS: 202, body status duplicate_ignored

## Verification Steps
### A. Verify install callback writes installation mapping
1. Start backend server.
2. Generate install URL by calling GET /auth/github/app/install with valid auth token.
3. Copy the returned state value from URL query.
4. Simulate callback by opening:
   - /auth/github/app/callback?installation_id=123456&setup_action=install&state=<state>
5. Validate in MongoDB that student document has:
   - githubAppInstalled = true
   - githubAppInstallationId = "123456"

### B. Verify webhook rejects invalid signature
1. Send webhook request with fake signature:

   curl -X POST http://localhost:5001/api/webhooks/github \
     -H "Content-Type: application/json" \
     -H "X-GitHub-Event: ping" \
     -H "X-GitHub-Delivery: test-delivery-invalid" \
     -H "X-Hub-Signature-256: sha256=invalid" \
     -d '{"zen":"test"}'

2. Expected result:
   - HTTP 401
   - JSON error contains "Invalid webhook signature"

### C. Verify webhook accepts valid signature
1. Prepare payload in file payload.json with content:
   {"zen":"test"}
2. Generate valid signature using GITHUB_APP_WEBHOOK_SECRET.
3. Send request with computed signature.
4. Expected result:
   - HTTP 200 for ping event
   - Response contains status ok

### D. Verify delivery idempotency
1. Re-send the exact same valid delivery ID.
2. Expected result:
   - HTTP 202
   - status = duplicate_ignored

## Handoff Criteria
- [x] All checklist items are marked complete.
- [x] Screenshots or logs attached for steps A-D.
- [x] Phase 0 status updated to complete in [PHASE-0-DECISION-RECORD.md](PHASE-0-DECISION-RECORD.md).
