# Phase 7 — Guardrails + expiry pause

**Status:** ⬜ Not started  
**Depends on:** Phases 3, 5  
**User-visible:** Yes (prevents bad edge cases)

## Goal

Make reschedule safe in production: pause auto-expiry while negotiating, cancel
pending requests when match is cancelled, enforce counter cap, and block
reschedule when inappropriate.

## Files to edit

| File | Change |
|------|--------|
| `meetup-confirmation-service.ts` | `expireUnconfirmedMeetups` — skip if pending reschedule |
| `match-hold-service.ts` | `cancelMatchHold` — cancel pending reschedule rows |
| `meetup-reschedule-service.ts` | Centralize all guard checks |
| `meetup-confirmation-payment.ts` | Align payment gates with request eligibility |

## Rules to implement

### Expiry pause

In `expireUnconfirmedMeetups`:

```ts
if (row.pendingRescheduleRequestId) return; // or check joined pending status
```

When pending is cleared (accept / cancel match / cancel request), expiry cron
resumes normal behavior from **new** `slot_confirm_by` if slot was updated on accept.

### Match cancel

`cancelMatchHold`:

1. Set any `pending` reschedule on this match → `cancelled`.
2. Clear `pending_reschedule_request_id`.

### Status gates

| `mutual_matches.status` | Can request? | Can respond? |
|-------------------------|--------------|--------------|
| `mutual`, `being_arranged` | Yes (if confirmed) | Yes |
| `upcoming` | **No** (v1) | N/A |
| `cancelled`, `expired`, `completed` | No | No |

### Time gates

- Cannot request if `proposed_confirm_by` for **current** slot already passed **unless**
  pending reschedule exists (partner still deciding).
- Cannot accept a proposal whose `proposed_confirm_by <= now`.

### Counter cap

After 3 counters in chain, `decline` returns `counter_cap_reached`; mobile shows
only Accept + Cancel match.

### Payments

If `payments_enabled`:

- Requester must have paid (`date_payments.status === 'paid'` for their user).
- Accept still requires both paid before finalize (existing `tryFinalizeConfirmedMeetup`).

## Steps

1. Implement expiry skip with a test that would have expired but didn't.
2. Wire cancel cleanup.
3. Add integration test or script for cap = 3.
4. Document behavior in service file header.

## How to test

1. Create match near `slot_confirm_by`; start reschedule → run expiry cron → match
   **not** expired.
2. Accept reschedule → new `slot_confirm_by` in future → confirm still valid.
3. Cancel match → pending request `cancelled`, pointer null.
4. Fourth counter attempt → `counter_cap_reached`.

## Done when

- [ ] Expiry cron respects pending reschedule.
- [ ] Cancel match cleans up requests.
- [ ] Cap enforced.
- [ ] Payment gate aligned with phase 3 spec.

## Rollback

Remove expiry skip branch only if no pending rows in prod.
