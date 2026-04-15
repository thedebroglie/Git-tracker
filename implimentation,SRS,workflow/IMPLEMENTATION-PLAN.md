# GitTracker - Full Implementation Plan (Remaining Work)

Date: 2026-04-16

## Goal
Complete all remaining SRS requirements and ship a production-ready release.

## Current Status Snapshot
- Core backend exists (auth, sync queue, worker, scoring, anti-cheat, leaderboard APIs).
- Remaining major gaps: GitHub App + webhooks, CQE + Decay, explainability module, identity mapping robustness, production hardening.

## Phase 0 - Decision Gate (Day 1-2)
### Objective
Lock architecture decisions before implementing remaining modules.

### Locked Decisions
1. Storage: MongoDB (final decision, no PostgreSQL migration in this phase plan).
2. GitHub integration: Full GitHub App installation flow (mandatory baseline, not OAuth-only).

### Tasks
1. Finalize MongoDB schema/index updates needed for remaining phases.
2. Implement GitHub App installation flow foundation (installation callback and installation_id mapping).
3. Define private repository policy and permission scope.
4. Update SRS to remove contradictions and freeze v1.1 scope.

### Deliverables
- Phase 0 decision record with locked choices.
- Updated SRS (v1.1) aligned to MongoDB + GitHub App flow.

### Exit Criteria
- Architecture decisions are locked and reflected in docs and implementation backlog.

## Phase 1 - Platform Hardening (Week 1)
### Objective
Make the current backend safe and operable for scaling.

### Tasks
1. Configuration and secrets hardening.
2. Structured logs with request IDs.
3. Unified error handling and error code contract.
4. Health/readiness checks for API, MongoDB, Redis, and worker.
5. Basic operational runbook.

### Deliverables
- Stable startup checks.
- Log and error standards documented.

### Exit Criteria
- Service health can be validated in dev/staging.

## Phase 2 - GitHub App + Webhook Ingestion (Week 2)
### Objective
Implement SRS-compliant GitHub integration with event-driven updates.

### Tasks
1. Add GitHub App installation callback flow.
2. Store installation_id mapping to student identity.
3. Add webhook endpoint with signature verification.
4. Handle key events:
   - installation
   - installation_repositories
   - push
   - pull_request
   - issues
5. Add idempotency and replay protection.
6. Keep pull sync as fallback.

### Deliverables
- Working GitHub App install flow.
- Verified webhook processing pipeline.

### Exit Criteria
- Installation mapping and webhook processing tested end-to-end.

## Phase 3 - Data Ingestion + Normalization Layer (Week 3)
### Objective
Standardize contribution event ingestion and transformation.

### Tasks
1. Define normalized event schema.
2. Transform provider payloads into normalized metadata events.
3. Add batch ingestion for backfills.
4. Add ingestion retries and dead-letter handling.
5. Define metadata retention policy.

### Deliverables
- Normalized event pipeline.
- Ingestion quality checks and retry behavior.

### Exit Criteria
- Replays are deterministic and idempotent.

## Phase 4 - CQE + Decay Engine (Week 4)
### Objective
Implement missing scoring components from SRS.

### Tasks
1. Implement Contribution Quality Engine (quality score 0..1).
2. Add quality features:
   - LOC bands
   - file diversity
   - PR association
   - spam/low-value signals
3. Implement Decay Engine (time-based influence reduction).
4. Integrate CQE and decay into final score computation.
5. Version scoring logic for future safe tuning.

### Deliverables
- CQE module.
- Decay module.
- Updated scoring pipeline.

### Exit Criteria
- CQE and decay impact visible and testable in score outputs.

## Phase 5 - Explainability (Proof-of-Work) (Week 5)
### Objective
Provide transparent score reasoning to users.

### Tasks
1. Add dedicated explainability API endpoint(s).
2. Return full score rationale:
   - metric contributions
   - caps/normalization effects
   - CQE impact
   - decay impact
   - anti-cheat flag reasons
3. Add response contract for UI.

### Deliverables
- Explainability API.
- Score rationale payload specification.

### Exit Criteria
- User can inspect exactly why their score is what it is.

## Phase 6 - Identity Mapping Service (Week 5)
### Objective
Make account linkage robust across GitHub changes.

### Tasks
1. Track GitHub node ID and username history.
2. Handle username changes safely.
3. Harden disconnect/reconnect behavior.
4. Add account deletion and cleanup flow.

### Deliverables
- Reliable identity mapping lifecycle.

### Exit Criteria
- Username changes do not break profile continuity.

## Phase 7 - Leaderboard + Analytics Expansion (Week 6)
### Objective
Complete user-facing ranking insights and improve performance.

### Tasks
1. Add rank trend snapshots and history endpoints.
2. Improve leaderboard filtering and cohort views.
3. Strengthen cache invalidation strategy.
4. Add admin review endpoint(s) for anti-cheat flags.

### Deliverables
- Enhanced leaderboard analytics.

### Exit Criteria
- Rank/trend outputs are consistent and performant.

## Phase 8 - Frontend Completion (Week 6-7)
### Objective
Finish end-to-end UI journey per SRS.

### Tasks
1. Complete dashboard views:
   - sync status
   - score, rank, tier
   - contribution breakdown
   - explainability panel
   - flag visibility
2. Add robust empty/loading/error UX states.
3. Add pagination and filter UX polish.

### Deliverables
- End-to-end user journey complete in UI.

### Exit Criteria
- New user can register, connect GitHub, sync, and understand score.

## Phase 9 - Security + Privacy + Compliance Pass (Week 7)
### Objective
Validate security/privacy claims before release.

### Tasks
1. Threat-model critical routes and integrations.
2. Validate secret handling and token lifespan.
3. Verify metadata-only storage policy in practice.
4. Add route-level abuse protections and limits.

### Deliverables
- Security and privacy checklist report.

### Exit Criteria
- All must-pass controls are green.

## Phase 10 - Testing, Performance, Release (Week 8)
### Objective
Ship with confidence.

### Tasks
1. Expand automated tests:
   - unit tests (CQE, decay, anti-cheat, scoring)
   - integration tests (sync pipeline, webhooks, retries)
   - E2E tests (full user flow)
2. Run performance/load testing for API and worker throughput.
3. Prepare release checklist and rollback plan.
4. Staging soak test, then production release.

### Deliverables
- Green CI quality gates.
- Release package and runbook.

### Exit Criteria
- Production-ready deployment approval.

## Milestone Plan
- Milestone M1 (End Week 2): GitHub App installation flow and webhooks operational.
- Milestone M2 (End Week 4): Normalization, CQE, and Decay integrated into scoring.
- Milestone M3 (End Week 6): Explainability, identity robustness, and analytics complete.
- Milestone M4 (End Week 8): Security/performance pass and production-ready release.

## Priority Order (Execution)
1. Decision Gate
2. GitHub App + Webhooks
3. Normalization
4. CQE + Decay
5. Explainability
6. Identity Mapping
7. Analytics and Frontend completion
8. Security/Privacy pass
9. Release hardening

## Immediate Next Actions (This Week)
1. Update SRS language to explicitly standardize on MongoDB.
2. Start GitHub App installation + webhook implementation.
3. Define normalized event schema draft.
4. Create acceptance criteria checklist for each phase.
