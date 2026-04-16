# Phase 3 Data Ingestion + Normalization Checklist

Date: 2026-04-16
Status: Complete

## Scope

Phase 3 completion criteria:

1. Define normalized event schema.
2. Transform incoming provider payloads into normalized metadata events.
3. Add batch ingestion for backfills.
4. Add retries and dead-letter behavior.
5. Define metadata retention policy.

## Task Checklist

- [x] Normalized event model created.
- [x] Webhook ingestion envelope model created.
- [x] Dead-letter model created.
- [x] Normalization service maps webhook payloads into structured metadata events.
- [x] Ingestion service persists envelopes and normalized events.
- [x] Retry logic implemented with max retry policy.
- [x] Dead-letter escalation implemented after max retries.
- [x] Batch backfill route added.
- [x] Retention policy implemented via TTL fields and env configuration.
- [x] Live acceptance verification completed.

## Code References

1. backend/models/NormalizedContributionEvent.js
2. backend/models/WebhookIngestionEnvelope.js
3. backend/models/IngestionDeadLetter.js
4. backend/services/normalizationService.js
5. backend/services/ingestionService.js
6. backend/routes/webhookRoutes.js
7. backend/routes/syncRoutes.js
8. backend/.env.example

## Executed Verification Results

1. Signed issues webhook accepted with ingestion summary:
   - status=success
   - normalizedCount=1
2. Envelope persisted:
   - deliveryId=phase3-issues-5
   - normalizedStatus=success
   - retryCount=0
3. Normalized metadata event persisted:
   - eventId=phase3-issues-5:issues
   - eventType=issues
   - installationId=999999
   - repositoryFullName=phase3-org/repo-d
4. Dead-letter verification:
   - deadLetterCount=0 for the verified delivery.
5. Batch backfill verification:
   - POST /api/sync/backfill-webhooks
   - Summary: scanned=1, success=1, deadLettered=0, failed=0.
