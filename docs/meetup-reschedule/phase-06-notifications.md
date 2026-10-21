# Phase 6 — Notifications + push types

**Status:** ✅ Done  
**Depends on:** Phase 3 (fires from service)  
**User-visible:** Yes (push)

## Goal

Notify the partner when a reschedule is requested, accepted, or countered —
same patterns as `meetup-push-notifications-service.ts`.

## Files to edit / create

| File | Change |
|------|--------|
| `src/lib/notification-types.ts` | New constants |
| `src/lib/services/meetup-reschedule-push.ts` | New helpers (or extend meetup-push) |
| `meetup-reschedule-service.ts` | Call push after request / accept / counter |
| `strath-mobile/lib/services/notifications-service.ts` | Mirror type constants |
| `notification-counts-service.ts` | Optional: `rescheduleNeedsResponse` count |

## New notification types

```txt
MEETUP_RESCHEDULE_REQUESTED   // partner: "Mariah wants to move your date to Sat 13 Jun, 15:00"
MEETUP_RESCHEDULE_ACCEPTED      // requester: "Your new date is set" (or reuse DATE_SCHEDULED)
MEETUP_RESCHEDULE_COUNTERED     // other side: "They suggested a different time — your turn"
MEETUP_RESCHEDULE_CANCELLED     // optional: requester withdrew
```

## Push payload `data` (for phase 11)

```json
{
  "type": "MEETUP_RESCHEDULE_REQUESTED",
  "mutualMatchId": "...",
  "requestId": "...",
  "route": "dates"
}
```

## Copy (draft)

| Type | Title | Body |
|------|-------|------|
| REQUESTED | Date change request | `{name} wants to move your StrathSpace date to {slotLabel}.` |
| COUNTERED | Counter-proposal | `{name} suggested a different time. Tap to respond.` |
| ACCEPTED | Date updated | `You're set for {slotLabel} with {name}.` |

Use `formatMeetupSlot` server-side or duplicate Nairobi formatting in push helper.

## Steps

1. Implement `sendRescheduleRequestedPush`, `sendRescheduleCounteredPush`.
2. On accept, either send `MEETUP_RESCHEDULE_ACCEPTED` or existing `DATE_SCHEDULED`
   from finalize — **pick one** to avoid duplicate pushes.
3. Wire into service at end of successful transactions (after commit).
4. Add badge count: viewer has `pending` where `isYourTurnToRespond`.

## How to test

1. Two devices/simulators with push tokens registered.
2. User A requests → User B receives REQUESTED push (foreground + background).
3. User B counters → User A receives COUNTERED.
4. User B accepts → both get ACCEPTED or DATE_SCHEDULED (once only).

## Done when

- [x] Types registered on backend + mobile (+ `meetup-reschedule-push.test.ts`).
- [x] Request / counter / cancel pushes; accept uses `DATE_SCHEDULED` when finalized.
- [x] `rescheduleNeedsResponse` in notification counts + Dates tab badge via `datesActionable`.

## Rollback

Remove push calls from service; types harmless if unused.
