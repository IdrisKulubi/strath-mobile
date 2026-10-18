# Phase 6 — Payment `status` API

**Status:** ✅ Done
**Depends on:** Phases 1, 5
**User-visible:** No (consumed by the app in phase 10)

## Goal

A read endpoint the mobile app polls after returning from the web payment page,
so the UI can show the right state (waiting / both paid / expired) without
trusting the client.

## Files to create

- `src/app/api/payments/status/route.ts`

## Endpoint

```txt
GET /api/payments/status?dateMatchId=<id>
```

## Steps

1. Auth via `getSessionWithFallback`; 401 if none.
2. Load the `date_matches` row; 403 if the user is not a participant.
3. Compute from `date_payments` + the match row:
   - `currentUserPaid` — does this user have a `paid` row?
   - `otherUserPaid` — does the partner?
4. Respond:

   ```json
   {
     "dateMatchId": "uuid",
     "paymentState": "paid_waiting_for_other",
     "currentUserPaid": true,
     "otherUserPaid": false,
     "amount": 499,
     "currency": "KES",
     "paymentDueBy": "2026-06-05T10:00:00.000Z"
   }
   ```

   (`amount` is the human KES value = `amountCents / 100`.)

5. Keep it cheap — this gets polled. Single query with a join or two reads.

## How to test

1. **Before any payment** (state `awaiting_payment`):

   ```bash
   curl "http://localhost:3000/api/payments/status?dateMatchId=<id>" \
     -H "Authorization: Bearer <USER_A_TOKEN>"
   ```
   Expect `currentUserPaid: false, otherUserPaid: false`.

2. **After user A pays** (from phase 5): A's status shows
   `currentUserPaid: true, paymentState: paid_waiting_for_other`; calling as
   user B shows `currentUserPaid: false, otherUserPaid: true`.

3. **After both pay:** both see `paymentState: both_paid`,
   `currentUserPaid: true, otherUserPaid: true`.

4. **Auth/authorization:** no token → 401; a non-participant's token → 403.

5. **Amount/currency** fields are correct (499 / KES) and `paymentDueBy` matches
   the DB.

## Done when

- [x] Returns accurate per-viewer payment state.
- [x] Correct from both users' perspectives.
- [x] 401/403 enforced.
- [x] Cheap enough to poll every few seconds.

## Rollback

Delete the route.
