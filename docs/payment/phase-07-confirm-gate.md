# Phase 7 — Pay-to-confirm backend gate

**Status:** ✅ Done
**Depends on:** Phases 1, 5, 6
**User-visible:** Behavior change **only when `payments_enabled` is ON**

## Goal

Wire payment into the real slot-confirmation flow so that, when the flag is on,
**a user cannot confirm their meetup slot without a verified payment.** Paying is
confirming. When the flag is off, the current free flow is 100% unchanged.

Key files (already exist):
- `src/lib/services/meetup-confirmation-service.ts` — `confirmMeetupSlot`,
  `tryFinalizeConfirmedMeetup`, `expireUnconfirmedMeetups`, `initializeMeetupSlotForMutual`.
- `src/app/api/me/match-hold/confirm-slot/route.ts` — the route the app calls.

## Behavior with flag ON

1. **At mutual creation**, when the slot + `date_matches` row are created
   (`initializeMeetupSlotForMutual`), also set the payment fields:
   - `date_matches.payment_state = 'awaiting_payment'`
   - `date_matches.payment_due_by = slotConfirmBy` (reuse the existing slot
     deadline — payment window == confirm window; cleanest and consistent).
   - `payment_amount_cents = PAYMENT_CONFIG.amountCents`.

   > Only do this when `payments_enabled` is ON; otherwise leave
   > `payment_state = 'not_required'` so the free flow proceeds.

2. **`confirmMeetupSlot(mutualMatchId, userId)`** — add a guard near the top
   (after the `isSlotConfirmEligibleStatus` check), only when flag is ON:
   - Look up this user's `date_payments` row for the linked `legacyDateMatchId`.
   - If not `paid` → return a new result `{ status: "payment_required" }` instead
     of writing `userA/BSlotConfirmedAt`.
   - If `paid` → proceed exactly as today (set confirmation, try finalize).

   Because phase 5's `markPaymentPaid` already sets the confirmation timestamp on
   successful payment, the confirm route mostly becomes a **read/advance** path
   when payments are on. Keep both:
   - Payment (webhook/verify) sets the timestamp.
   - `confirmMeetupSlot` refuses to set it without payment (defense in depth, and
     handles clients that still call confirm directly).

3. **`tryFinalizeConfirmedMeetup`** — add a guard: with flag ON, only finalize
   when `date_matches.payment_state === 'both_paid'` (in addition to the existing
   "both confirmed + window open" checks). With flag OFF, unchanged.

4. **Confirm-slot route** — map the new `payment_required` result to a response
   the app understands, e.g.:

   ```json
   { "ok": false, "reason": "payment_required",
     "paymentToken": "<signed token>", "webPaymentUrl": "https://strathspace.com/payments" }
   ```
   Generate the signed token here (phase 2) so the app can open the web page
   directly. Only include this when the flag is on.

5. **Result type** — extend `ConfirmMeetupSlotResult` with
   `{ status: "payment_required"; paymentToken: string }`.

## Steps

1. Add a small helper `getPaymentsEnabled()` (cached read of the flag) in
   `payment-flags.ts` to avoid hammering the DB in hot paths.
2. Edit `initializeMeetupSlotForMutual` **and** `candidate-pairs-service.ts`
   (primary mutual-creation path) to set payment fields when enabled.
3. Edit `confirmMeetupSlot` to add the payment guard.
4. Edit `tryFinalizeConfirmedMeetup` to require `both_paid` when enabled.
5. Edit the confirm-slot route to surface `payment_required` + a fresh token.
6. Make sure `expireUnconfirmedMeetups` still works (phase 8 adds credit logic on
   top of it — for now expiry just behaves as today).

## How to test

Run two scenarios: **flag OFF** (regression) and **flag ON** (new gate).

### Flag OFF (must be unchanged)

1. `payments_enabled = false`.
2. Seed a mutual match, call `confirm-slot` for both users.
3. Assert the date finalizes to `scheduled`/`upcoming` exactly as before. No
   payment rows touched.

### Flag ON

1. `payments_enabled = true` (DB flag).
2. Seed a fresh mutual match → assert `date_matches.payment_state = awaiting_payment`,
   `payment_due_by = slotConfirmBy`.
3. **Confirm without paying:**
   ```bash
   curl -X POST http://localhost:3000/api/me/match-hold/confirm-slot \
     -H "Authorization: Bearer <USER_A_TOKEN>" -H "Content-Type: application/json" \
     -d '{"mutualMatchId":"<id>"}'
   ```
   Expect `reason: "payment_required"` + a `paymentToken`. Assert
   `user_a_slot_confirmed_at` is still NULL.
4. **Pay as A** (phases 3–5) → assert `user_a_slot_confirmed_at` is now set and
   `payment_state = paid_waiting_for_other`. Re-call confirm-slot as A → returns
   confirmed, not payment_required.
5. **Pay as B** → `payment_state = both_paid`, `tryFinalizeConfirmedMeetup`
   schedules the date (`date_matches.status = scheduled`,
   `mutual_matches.status = upcoming`).
6. **Finalize guard:** with only A paid, force-call `tryFinalizeConfirmedMeetup`
   → returns not finalized (reason reflects payment), date stays unscheduled.

## Done when

- [x] Flag OFF → identical to today (regression passes).
- [x] Flag ON → confirming without paying returns `payment_required` + token.
- [x] Paying sets the slot confirmation (via phase 5) and re-confirm succeeds.
- [x] Date only finalizes when `both_paid`.

## Rollback

Guard everything with the flag; setting `payments_enabled = false` instantly
restores the free flow. Code can stay deployed safely.
