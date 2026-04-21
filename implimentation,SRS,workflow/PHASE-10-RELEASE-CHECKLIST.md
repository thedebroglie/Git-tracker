# Phase 10 Release Checklist

Date: 2026-04-17
Status: Active

## 1) Automated Gate Evidence

| Gate | Command | Current Result | Evidence |
| --- | --- | --- | --- |
| Backend unit/integration/contract tests | `cd backend && npm test` | PASS | 12 passed, 0 failed |
| Backend perf smoke baseline | `cd backend && npm run perf:smoke` | PASS | 10,000 iterations in 19.64 ms (1.96 us avg) |
| Frontend production build | `cd frontend && npm run build` | PASS | Vite production bundle generated |
| Frontend E2E critical flows | `cd frontend && npm run test:e2e` | PASS | 3 passed, 0 failed |

## 2) Pre-Release Checklist

- [x] Backend tests green.
- [x] Frontend build green.
- [x] Frontend E2E baseline green.
- [x] Perf smoke baseline captured.
- [ ] Release version/tag selected.
- [ ] Deployment window approved.
- [ ] Stakeholder sign-off complete.

## 3) Staging Soak Evidence

Target soak duration: 60 minutes minimum.

| Field | Value |
| --- | --- |
| Staging URL | TODO |
| Build/Commit | TODO |
| Soak start (UTC) | TODO |
| Soak end (UTC) | TODO |
| Total soak minutes | TODO |
| Avg API latency p95 | TODO |
| Error rate (%) | TODO |
| Queue depth max (sync) | TODO |
| Webhook ingest success rate | TODO |
| Observed regressions | TODO/None |

Soak pass criteria:

- API error rate remains <= 1.0%.
- No sustained sync queue backlog growth.
- No auth/login route regressions.
- Leaderboard and profile endpoints remain stable.

## 4) Rollback Plan

Rollback triggers:

- API error rate > 3% for 5+ minutes.
- Authentication failures spike above baseline.
- Sync queue stuck or dead-letter growth trend.
- Severe UI regression on login/dashboard/leaderboard path.

Rollback execution steps:

1. Announce rollback start in release channel.
2. Freeze new deployments and disable traffic shift.
3. Redeploy previous known-good build for backend.
4. Redeploy previous known-good build for frontend.
5. Verify health endpoints and core paths.
6. Re-run smoke checks (auth, dashboard, leaderboard, sync status).
7. Announce rollback complete with incident summary.

Rollback validation commands:

- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd frontend && npm run test:e2e`

## 5) Final Sign-Off

| Role | Name | Status | Timestamp |
| --- | --- | --- | --- |
| Engineering | TODO | Pending | TODO |
| QA | TODO | Pending | TODO |
| Product | TODO | Pending | TODO |
