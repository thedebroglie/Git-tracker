# GitTracker Software Requirements Specification (SRS)

## 1. Introduction
### 1.1 Purpose
This document defines the functional and non-functional requirements for GitTracker, a web platform designed to evaluate and rank student GitHub contributions in a fair, transparent, and privacy-aware way.

### 1.3 Phase 0 Decision Lock
The following architecture decisions are locked for this milestone:
1. Primary database remains MongoDB.
2. GitHub integration baseline is full GitHub App installation flow.
3. OAuth-only integration is not the target baseline for upcoming phases.

### 1.2 Scope
GitTracker provides:
1. College-authenticated student access.
2. GitHub integration and account linking.
3. Contribution tracking and metric extraction.
4. Quality-aware scoring.
5. Anti-cheat signal detection.
6. Leaderboard and student profile APIs.
7. Explainability for score and ranking outputs.

## 2. Overall System Overview
GitTracker is a multi-stage backend workflow:

User -> Auth -> GitHub Connect -> Sync Queue -> Data Fetch -> Normalization -> Anti-Cheat -> Scoring -> Rank/Tier -> Storage -> API -> UI

Current implementation in this repository is based on:
1. Node.js + Express API.
2. MongoDB for student and stats persistence.
3. Redis for cache/state.
4. BullMQ worker pipeline for sync jobs.

## 3. User Workflow (End-to-End)
### 3.1 First-Time User Journey
1. Website access:
   User opens GitTracker and sees login/registration options.
2. Authentication:
   User registers or logs in with institute email already present in seed/student records.
3. Initial dashboard state:
   Profile exists with score/rank defaults until GitHub is connected and synced.
4. GitHub connect:
   User installs the GitHub App and approves repository permissions.
5. Callback and mapping:
   Backend receives installation callback, stores installation_id mapping, and verifies ownership linkage.
6. Background sync request:
   User triggers sync. System enqueues job with cooldown/rate-limit protections.
7. Processing pipeline:
   Data is fetched, analyzed for anti-cheat, scored, ranked, and persisted.
8. Dashboard refresh:
   User sees updated score, tier, rank, and profile metrics.
9. Leaderboard interaction:
   User browses public leaderboard with filters and pagination.
10. Score explainability:
   User can inspect contribution metrics and scoring inputs.

## 4. Functional Requirements
### 4.1 Authentication Module
Input:
1. Email
2. Password

Functions:
1. Validate and normalize email.
2. Verify student eligibility.
3. Register/login user.
4. Issue JWT session token.

Output:
1. Authenticated session response.

### 4.2 GitHub Integration Module
Functions:
1. Redirect user to GitHub App installation URL.
2. Handle installation callback and capture installation_id.
3. Persist installation_id to student identity mapping.
4. Generate and use short-lived installation access tokens for data access.
5. Support reconnect/disconnect lifecycle.

### 4.3 Data Ingestion Module
Sources:
1. GitHub GraphQL API.
2. GitHub Webhooks.

Functions:
1. Fetch contribution metadata.
2. Aggregate repository and contribution signals.
3. Handle pagination for repositories.
4. Cache results in Redis with TTL.
5. Process signed webhook events with idempotency.

### 4.4 Metadata-Only Sync Requirement
Functions:
1. Fetch contribution metadata and statistics.
2. Compute ranking metrics.
3. Avoid source code storage in application database.

### 4.5 Contribution Normalizer
Functions:
1. Transform GitHub response into normalized metrics, including commits, PRs, issues, reviews, repos, stars/forks/watchers, language diversity, and activity windows.

### 4.6 Anti-Cheat Engine
Detects patterns such as:
1. Empty repository spam.
2. Activity bursts.
3. PR farming.
4. Suspicious star/follower mismatch.
5. Self-PR inflation.

Output:
1. Flags for review.
2. No direct auto-ban action.

### 4.7 Contribution Quality and Scoring Engine
Functions:
1. Apply caps and normalization.
2. Compute category-wise scores.
3. Compute total bounded score.

Output:
1. Total score.
2. Score breakdown.
3. Applied caps metadata.

### 4.8 Rank and Tier Engine
Functions:
1. Classify tier from score.
2. Compute leaderboard rank from score ordering.

Output:
1. Tier label.
2. Rank position.

### 4.9 Sync and Queue Orchestration
Functions:
1. Enqueue manual sync jobs.
2. Register repeatable nightly sync.
3. Process jobs in worker.
4. Respect sync cooldown.

### 4.10 Storage System
MongoDB stores:
1. Student identity/profile/auth references.
2. GitHub-derived metrics.
3. Score/rank/tier state.
4. Anti-cheat flags and rank history.

Redis stores:
1. Integration state and short-lived cache entries.
2. GitHub stats cache.
3. Queue and scheduling support.

### 4.11 API Layer
Provides endpoints for:
1. Auth and profile retrieval.
2. GitHub sync trigger and status.
3. Public leaderboard and filters.
4. Student profile and position views.

### 4.12 Dashboard/Frontend Contract
UI should display:
1. Score.
2. Tier and rank.
3. Contribution breakdown.
4. Sync state and cooldown timing.
5. Anti-cheat flags when present.

### 4.13 Proof-of-Work/Explainability Contract
System should expose enough fields to explain score drivers:
1. PR/commit/issues/review metrics.
2. Quality and caps effects.
3. Flag reasons.
4. Rank/tier rationale.

### 4.14 Identity Mapping Service
Handles:
1. Mapping student identity to GitHub identity.
2. Reconnect/disconnect flows.
3. Updates to GitHub username linkage over time.

## 5. Non-Functional Requirements
### 5.1 Security
1. JWT-based protected routes.
2. GitHub App token security with short-lived installation tokens.
3. Sensitive token fields excluded from default query serialization.
4. GitHub webhook signature verification.

### 5.2 Privacy
1. Metadata-centric processing.
2. No repository source code persistence in app data model.

### 5.3 Performance
1. Redis cache for GitHub fetch path.
2. Async queue-based sync processing.
3. Paginated leaderboard queries.

### 5.4 Scalability
1. Worker-based architecture supports horizontal scaling.
2. Modular services for ingestion, scoring, and ranking.

### 5.5 Reliability
1. Queue retries and decoupled processing.
2. Repeatable nightly sync scheduling.
3. Health endpoints and startup dependency checks.

## 6. Limitations
1. Suspicious pattern detection is probabilistic and may produce false positives/negatives.
2. Contribution impact cannot be perfectly measured from metadata alone.
3. Access to private-repo signals depends on granted GitHub permissions.

## 7. Future Enhancements
1. AI-based commit quality classification.
2. Stronger anomaly and fraud detection.
3. Explainability UI with richer score trace view.
4. Cross-college or multi-tenant leaderboard support.
5. Advanced analytics and recruiter-facing dashboards.

## 8. Conclusion
GitTracker provides a transparent and scalable contribution evaluation pipeline by combining GitHub ingestion, anti-cheat checks, explainable scoring, and leaderboard APIs. The architecture is suitable for iterative growth while preserving privacy and operational clarity.

## 9. Workflow Diagram
Mermaid source file:
1. [PROJECT-WORKFLOW.mmd](PROJECT-WORKFLOW.mmd)
2. [PROJECT-SYNC-PIPELINE.mmd](PROJECT-SYNC-PIPELINE.mmd)

To preview in VS Code:
1. Open [PROJECT-WORKFLOW.mmd](PROJECT-WORKFLOW.mmd).
2. Run command: Mermaid: Open Preview.
3. Or open [PROJECT-SYNC-PIPELINE.mmd](PROJECT-SYNC-PIPELINE.mmd) and run Mermaid: Open Preview.
