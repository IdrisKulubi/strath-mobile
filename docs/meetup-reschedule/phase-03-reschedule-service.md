# Phase 3 — Reschedule service (request / respond / apply)

**Status:** ✅ Done  
**Depends on:** Phases 1, 2  
**User-visible:** No (callable from routes/tests)

## Goal

Implement all business rules in one service:
`requestReschedule`, `acceptReschedule`, `declineWithCounter`, `cancelPendingReschedule`,
plus helpers to load pending state for a viewer.

## Files to edit / create

- New `backend/strath-backend/src/lib/services/meetup-reschedule-service.ts`
- Edit `meetup-confirmation-service.ts` — extract or call shared **apply slot** helper
- Optional `meetup-reschedule-types.ts` for result unions

## Steps

### 1. Eligibility: `assertCanRequestReschedule(mutualMatchId, userId)`

Return typed errors (don't throw unless that's your pattern):

| Check | Error code |
|-------|------------|
| Not participant | `not_participant` |
| Match `cancelled` / `expired` / `completed` | `match_closed` |
| Match already `upcoming` and date in the past | `date_passed` |
| Viewer has **not** confirmed slot (`user_a/b_slot_confirmed_at`) | `confirm_first` |
| Payments on and viewer not paid | `payment_required` |
| Existing `pending` request on this match | `pending_exists` |
| Proposed slot not in `listUpcomingMeetupSlotOptions` | `invalid_slot` |
| Proposed slot `confirmBy <= now` | `confirm_window_closed` |

### 2. `requestReschedule(mutualMatchId, userId, proposedScheduledAt)`

In a transaction:

1. Run eligibility (including validate proposed slot ∈ allowed list).
2. Insert `meetup_reschedule_requests` with `status: 'pending'`.
3. Set `mutual_matches.pending_reschedule_request_id`.
4. Optionally set `reschedule_paused_expiry_at = now()` (phase 7).
5. Return `{ requestId, proposedScheduledAt, confirmBy, partnerUserId }`.

Do **not** change `scheduled_at` yet.

### 3. `acceptReschedule(requestId, userId)` — responder only

1. Load request + match; assert `status === 'pending'`.
2. Assert `userId !== requested_by_user_id`.
3. In transaction:
   - Update `mutual_matches`: `scheduled_at`, `slot_confirm_by`, `assigned_slot`
     from request; set **both** `user_a_slot_confirmed_at` and `user_b_slot_confirmed_at`
     to `now()` (or keep existing if already set).
   - Update linked `date_matches.scheduled_at` if `legacy_date_match_id` set.
   - Mark request `accepted`, `responded_at`.
   - Clear `pending_reschedule_request_id`.
   - Mark any older pending in chain `superseded` if needed.
4. Call `tryFinalizeConfirmedMeetup(mutualMatchId)` (should succeed → `upcoming`).
5. Return `{ status: 'applied', scheduledAt, ... }`.

### 4. `declineWithCounter(requestId, userId, { reason, counterScheduledAt })`

1. Same pending + responder checks.
2. Validate `reason` non-empty (min length e.g. 3).
3. Count chain depth via `chain_root_id` or walk `counter_of_request_id` — if ≥ 3,
   return `counter_cap_reached`.
4. In transaction:
   - Set current request `declined` + `decline_reason` + `responded_at` (or `superseded`
     — pick one model: declined row stays for audit, new row is pending).
   - Insert new `pending` request from `userId` with `counter_of_request_id`.
   - Update `pending_reschedule_request_id` to new row.
5. Return `{ requestId: newId, ... }`.

### 5. `cancelPendingReschedule(mutualMatchId, userId)`

Either participant can cancel **their own** pending request only, OR either can
cancel if they created the pending one — **recommend:** only the `requested_by`
can cancel; the other must decline with counter or accept.

### 6. `getRescheduleStateForViewer(mutualMatchId, userId)`

Return shape for phase 5:

```ts
{
  canRequest: boolean;
  blockReason?: 'confirm_first' | ...;
  pending?: {
    requestId: string;
    proposedScheduledAt: string;
    proposedConfirmBy: string;
    requestedByUserId: string;
    isYourTurnToRespond: boolean;
    counterCount: number;
    declineReason?: string; // last decline in chain, for context
  };
}
```

### 7. Shared helper: `applyMeetupSlotToMatch(mutualMatchId, slot, scheduledAt, confirmBy)`

Used by accept path and keeps logic DRY with admin reschedule later.

## How to test

Use integration tests or manual calls from a temporary script:

1. **Request blocked before confirm:** User A not confirmed → `confirm_first`.
2. **Request OK:** User A confirmed → pending row + pointer set.
3. **Accept:** User B accepts → `scheduled_at` updated, both confirmed, status `upcoming`.
4. **Decline + counter:** User B declines → new pending for A; A sees `isYourTurnToRespond`.
5. **Invalid slot:** Random ISO timestamp → `invalid_slot`.
6. **Double request:** Second request while pending → `pending_exists`.

## Done when

- [x] All functions implemented with typed results.
- [x] Transaction boundaries correct (no orphan pending pointer).
- [x] `tryFinalizeConfirmedMeetup` runs on accept.
- [x] `validation.test.ts` covers slot matching, chain cap, eligibility helpers.

## Rollback

Delete service file; no API exposed yet.
