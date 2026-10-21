# Phase 5 — Expose reschedule state in existing reads

**Status:** ✅ Done  
**Depends on:** Phases 3, 4  
**User-visible:** Yes (data available to mobile; UI in phase 9–10)

## Goal

Mobile should learn about pending reschedule from APIs it already polls — no
extra round-trip required on every screen.

## Files to edit

| File | Change |
|------|--------|
| `meetup-confirmation-service.ts` | Extend `buildSlotConfirmationView` with `reschedule` block |
| `match-hold-service.ts` | Include reschedule in `getActiveMatchHoldForUser` |
| `mutual-match-service.ts` | Include in `listMutualDatesForUser` / mutual date DTO |
| `src/app/api/home/daily-matches/route.ts` | Verify shape passes through |
| `src/app/api/dates/mutual/route.ts` | Verify shape passes through |

## Response shape (add to slot confirmation / mutual date)

```ts
reschedule?: {
  canRequest: boolean;
  blockReason?: 'confirm_first' | 'pending_exists' | 'match_closed' | ...;
  pending?: {
    requestId: string;
    proposedScheduledAt: string;
    proposedConfirmBy: string;
    requestedByUserId: string;
    requestedByName?: string;
    isYourTurnToRespond: boolean;
    counterCount: number;
    lastDeclineReason?: string;
  };
};
```

## Steps

1. Call `getRescheduleStateForViewer` inside `buildSlotConfirmationView`.
2. Ensure `MutualDate` type on mobile (`hooks/use-date-requests.ts`) gets updated
   in phase 8 — note the field name here for consistency.
3. When match has no slot confirmation UI (already `upcoming`), still return
   `reschedule.canRequest: false` unless you later allow post-finalize reschedule
   (out of v1 scope).

## How to test

1. User A requests reschedule via curl (phase 4).
2. `GET /api/home/daily-matches` as User B → `hold.slotConfirmation.reschedule.pending`
   with `isYourTurnToRespond: true`.
3. `GET /api/dates/mutual` as User A → `canRequest: false`, `pending_exists` or
   pending with `isYourTurnToRespond: false`.
4. After accept → `pending` is null on both users' reads.

## Done when

- [x] `hold.slotConfirmation.reschedule` via `buildSlotConfirmationViewWithReschedule`.
- [x] `GET /api/dates/mutual` includes `reschedule` on each mutual row.
- [x] Optional field only — no breaking change for existing clients.

## Rollback

Stop calling helper in builders; field omitted.
