# Phase 11 — Deep links + in-app badges

**Status:** ✅ Done  
**Depends on:** Phases 6, 10  
**User-visible:** Yes

## Goal

Tapping a reschedule push opens the respond modal (or Dates tab with modal).
Home/Dates badges reflect `rescheduleNeedsResponse`.

## Files to edit

| File | Change |
|------|--------|
| `hooks/use-push-notifications.ts` | Route `MEETUP_RESCHEDULE_*` → open respond flow |
| `components/attention/action-required-banner.tsx` | Reschedule row |
| `notification-counts-service.ts` (backend) | Count pending for viewer |
| Mobile notification counts consumer | Show dot on Dates tab |

## Push routing

```ts
case 'MEETUP_RESCHEDULE_REQUESTED':
case 'MEETUP_RESCHEDULE_COUNTERED':
  router.push('/(tabs)/dates');
  // set global or route param: openRescheduleRequestId=...
  break;
```

Use existing pattern from payment pushes (`payments` → Dates tab).

**Implementation options:**

1. **Query param:** `/(tabs)/dates?rescheduleRequestId=uuid`
2. **Zustand/Context:** `setPendingRescheduleModal(requestId)` on notification handle
3. **Event emitter** — only if already used elsewhere

Pick one; document in code comment.

## Badge

Backend `GET /api/notifications/counts` (or equivalent) adds:

```json
{ "rescheduleNeedsResponse": 1 }
```

Mobile: show on Dates tab icon when > 0 (same as `slotConfirmPending`).

## Steps

1. Register handlers in `use-push-notifications.ts`.
2. On Dates screen focus, read `reschedule.pending` from mutual list — if
   `isYourTurnToRespond`, auto-present modal once per session (store dismissed id
   in `AsyncStorage` to avoid nag loops).
3. Add banner priority: reschedule respond > slot confirm > payment (define order).

## How to test

1. Background app → send REQUESTED push to B → tap → lands on Dates + modal.
2. Foreground push → toast + tap opens modal.
3. Badge clears after accept.

## Done when

- [ ] Push tap opens respond UI.
- [ ] Badge count accurate.
- [ ] No duplicate modals on every tab switch (dismiss logic works).

## Rollback

Push still sent but routes to Dates without modal.
