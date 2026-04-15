# Phase 0 Decision Record

Date: 2026-04-16
Status: Complete

## Locked Decisions
1. Database: MongoDB is retained as the primary datastore.
2. GitHub Integration Baseline: Full GitHub App installation flow.
3. OAuth-only flow: Treated as optional fallback, not the baseline.

## Why These Decisions
1. MongoDB aligns with the current data model and existing implementation.
2. GitHub App flow better supports secure, scoped, installation-based access and webhook-driven updates.
3. Keeping OAuth as fallback reduces migration risk during rollout.

## Scope Impact
1. No PostgreSQL migration in this milestone.
2. New work must target GitHub App installation_id mapping.
3. Webhook signature verification becomes a required control.

## Phase 0 Execution Checklist
- [x] Lock decisions in implementation plan.
- [x] Align SRS with locked decisions.
- [x] Add GitHub App/webhook configuration placeholders.
- [x] Add installation_id field and indexes to student model.
- [x] Add GitHub App installation callback route.
- [x] Add webhook receiver route with signature validation.
- [x] Create acceptance test checklist for Phase 0 handoff.
- [x] Execute acceptance checks and capture results.

## Immediate Implementation Tasks (Next)
1. Data model updates:
   - Add installation_id and installation metadata to student mapping.
2. Auth routes:
   - Add endpoint to return GitHub App install URL.
   - Add callback endpoint for installation completion.
3. Webhooks:
   - Add signed webhook endpoint.
   - Implement idempotency key persistence for replay protection.
4. Verification:
   - Test install callback writes mapping.
   - Test webhook rejects invalid signatures.

Implementation status update:
1. Signed webhook endpoint added at POST /api/webhooks/github.
2. Idempotency implemented via Redis key github:webhook:delivery:<deliveryId> with NX + TTL.
3. Verification procedure documented in PHASE-0-ACCEPTANCE-CHECKLIST.md.

## Definition of Done for Phase 0
1. Architecture lock is reflected in project docs.
2. GitHub App foundation endpoints and configuration are in place.
3. Phase 1 can begin without unresolved architecture decisions.

Definition of done verification:
1. Completed and validated in PHASE-0-ACCEPTANCE-CHECKLIST.md.
