# Phase 12 — Admin visibility (optional)

**Status:** ✅ Done  
**Depends on:** Phase 1  
**User-visible:** Admin only

## Goal

Ops can see reschedule history on a date/mutual match and optionally force-apply
a slot (reuse existing admin schedule/reschedule — do not duplicate unless needed).

## Scope (minimal v1)

- **Read-only** list of `meetup_reschedule_requests` for a `mutual_match_id` on
  admin date detail page.
- Show: who requested, proposed time, status, decline reason, timestamps.

## Out of scope for v1

- Admin-initiated partner reschedule (already exists via `scheduleDate` reschedule mode).
- Editing pending requests from admin.

## Files to edit (likely)

| File | Change |
|------|--------|
| Admin date detail page | New section "Reschedule history" |
| `lib/actions/admin.ts` or admin API | `listRescheduleRequestsForMutualMatch` |

## Steps

1. Add server function querying requests ordered by `created_at`.
2. Render table: Status | By | Proposed | Reason | At.
3. Link from mutual match admin row if separate pages exist.

## How to test

1. Run through request/counter/accept in staging.
2. Open admin date view → see 2–3 rows with correct statuses.

## Done when

- [x] History visible for support debugging.
- [x] No write actions required for pilot.

## Rollback

Hide admin section.
