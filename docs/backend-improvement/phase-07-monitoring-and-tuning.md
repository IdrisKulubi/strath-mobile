# Phase 07: Monitoring And Tuning

## Objective

Add backend visibility so ranking can be tuned safely after launch.

## Status

Implemented in this workspace.

## Implemented

- Added profile-intelligence admin overview service.
- Added protected admin API route for profile-intelligence monitoring.
- Added `/admin/profile-intelligence` dashboard page.
- Linked the dashboard from the main admin overview.
- Added coverage, stale-record, failed-job, pending-job, daily shortlist, decision-rate, open-to-meet-rate, reciprocal-match, matchmaker-request, and tuning-flag metrics.
- Added unit tests for metric aggregation and alert severity helpers.

## Scope

- Admin health panel for profile intelligence coverage.
- Daily matching metrics.
- Ranking explainability logs.
- A/B test switches for profile intelligence weights.
- Alerts for stale or failed analysis jobs.

## Metrics

- profiles with intelligence records
- stale intelligence records
- failed analysis jobs
- active users shown in daily shortlists
- dormant users shown in daily shortlists
- decision rate
- open-to-meet rate
- reciprocal match rate
- time to first mutual match
- incoming interest waiting count
- shortlist over-five count

## Files To Touch

- `backend/strath-backend/src/app/admin/page.tsx`
- `backend/strath-backend/src/lib/actions/admin.ts`
- `backend/strath-backend/src/lib/services/profile-intelligence-admin.ts`
- optional admin API routes

## Acceptance Criteria

- Admin can see whether profile intelligence coverage is healthy.
- Admin can see stale and failed jobs.
- Admin can compare recommendation outcomes before and after profile-intelligence ranking.
- Ranking weights can be changed through env or feature flags.

## Tests

- Admin metrics query test where possible.
- Unit tests for metric aggregation helpers.

## Manual Verification

Open admin dashboard and confirm intelligence coverage, stale jobs, and daily recommendation metrics render correctly.

## Rollback

Disable profile-intelligence weight flags and keep monitoring read-only.
