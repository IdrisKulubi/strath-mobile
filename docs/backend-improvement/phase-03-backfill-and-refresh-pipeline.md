# Phase 03: Backfill And Refresh Pipeline

## Status

Implemented in this workspace.

Verification:

- Backfill candidate selection and stale-record detection added.
- Profile intelligence worker analysis is mapped into `profile_intelligence`.
- Manual backfill script added.
- Cron route for queued profile intelligence jobs added.
- Profile update and photo asset sync enqueue refresh jobs without blocking user requests.
- Focused Phase 03 tests pass.
- Backend TypeScript check passes.

## Objective

Analyze all existing eligible profiles and keep profile intelligence fresh as users update their profiles or photos.

## Scope

- Add a backfill script for existing completed profiles.
- Add a cron or admin-triggered endpoint to process queued jobs.
- Add stale-record detection.
- Re-analyze profiles when profile text, preferences, or photos change.
- Store failures without blocking the app.

## Backfill Rules

Eligible profiles:

- completed profile
- not deleted
- not admin
- visible
- not discovery-paused unless admin explicitly includes them

Batch behavior:

- default batch size: 25 to 50 users
- retry failed jobs up to configured limit
- store `last_error`
- update `last_analyzed_at`
- preserve old intelligence until new analysis succeeds

## Files To Touch

- `backend/strath-backend/src/scripts/backfill-profile-intelligence.ts`
- `backend/strath-backend/src/app/api/cron/profile-intelligence/route.ts`
- `backend/strath-backend/src/lib/services/profile-intelligence-service.ts`
- profile update or photo sync code paths that should enqueue reanalysis

## Acceptance Criteria

- Existing users can be backfilled in batches.
- Failed profile analysis does not stop the whole batch.
- Re-running backfill is idempotent.
- Profile updates enqueue fresh analysis.
- Old intelligence remains usable during reanalysis.

## Tests

- Unit test stale detection.
- Unit test job retry limits.
- Unit test idempotent job creation.

## Manual Verification

Run the backfill against a small limit, confirm rows are created, then run it again and confirm duplicates are not created.

## Rollback

Stop the cron and ignore `profile_intelligence`. Existing recommendation behavior should still work.
