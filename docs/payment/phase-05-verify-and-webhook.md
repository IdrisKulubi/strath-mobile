# Phase 5 — `verify` API + Paystack webhook

**Status:** ⬜ Not started
**Depends on:** Phases 1, 2, 3
**User-visible:** No (server trust layer)

## Goal

Make payment state **server-trusted**. Two complementary paths mark a payment as
`paid`:

- **`verify`** — called from the callback page (fast UX feedback).
- **`webhook`** — Paystack's `charge.success` event (the **source of truth**,
  fires even if the user closes the browser).

Both must be **idempotent** and must update `date_matches.payment_state` and
`paid_user_count`, then advance the gate when both have paid.

## Files to create

- `src/app/api/payments/verify/route.ts`
- `src/app/api/webhooks/paystack/route.ts`
- Shared: `src/lib/payments/payment-service.ts` →
  `markPaymentPaid(reference, source, rawPayload)` used by both.

## Shared core: `markPaymentPaid`

One function, called by verify and webhook, does all state changes inside a
transaction:

1. Find `date_payments` by `paystackReference`. If not found → ignore (log).
2. If already `paid` → return early (idempotent; do not double count).
3. Re-verify with Paystack (`verifyTransaction(reference)`) — **even the webhook
   path re-verifies**, never trust amounts from the payload:
   - `status === "success"`
   - `amount === PAYMENT_CONFIG.amountCents` (exactly)
   - `currency === "KES"`
   - metadata `dateMatchId`/`userId` match the row
4. Set the payment row → `status: "paid"`, `paidAt: now`,
   `paystackTransactionId`, raw payload column.
5. Recompute the match:
   - `paidUserCount = count(paid date_payments for this match)`
   - Set that user's `userA/BSlotConfirmedAt = now` on `mutual_matches`
     (paying = confirming — this is the gate; see phase 7).
   - If `paidUserCount === 1` → `payment_state = paid_waiting_for_other`.
   - If `paidUserCount === 2` → `payment_state = both_paid`, then call
     `tryFinalizeConfirmedMeetup(mutualMatchId)` (phase 7 wires this fully).
6. Fire notifications (phase 11) — no-op stub for now.

> Setting the slot confirmation here is what makes "pay = confirm" work even when
> only the webhook fires (user closed the browser). Phase 7 makes the actual
> `confirmMeetupSlot` route refuse to confirm without a paid row, closing the
> loop both ways.

## `POST /api/payments/verify`

- Body `{ reference }`. Optionally require auth (the reference is unguessable but
  auth is cheap — prefer requiring the session).
- Call `markPaymentPaid(reference, "verify", verifyData)`.
- Respond:

  ```json
  { "success": true, "paymentState": "paid_waiting_for_other",
    "currentUserPaid": true, "otherUserPaid": false }
  ```

## `POST /api/webhooks/paystack`

- **Read the raw body as text** (needed for signature check) — in Next.js app
  router, `const raw = await req.text()`.
- Verify `x-paystack-signature` header via `verifyWebhookSignature(raw, sig)`;
  401 on mismatch.
- Parse events; handle `charge.success` → `markPaymentPaid(reference, "webhook", payload)`.
- (Stub `refund.processed` / `refund.failed` for phase 9.)
- Always return `200` quickly once accepted (Paystack retries on non-2xx).
- Store `rawWebhookPayload`.

## Steps

1. Write `markPaymentPaid` in `payment-service.ts` with a DB transaction +
   the "already paid" early return.
2. Write the verify route.
3. Write the webhook route (raw body + signature).
4. Register the webhook URL in the Paystack dashboard:
   `https://<your-domain>/api/webhooks/paystack` (use an ngrok/tunnel URL for
   local testing).

## How to test

1. **Happy path (webhook is truth):**
   - Complete a test payment from phase 4.
   - Confirm webhook hit (log) and:
     ```sql
     SELECT status, paid_at FROM date_payments WHERE paystack_reference='<ref>'; -- paid
     SELECT payment_state, paid_user_count FROM date_matches WHERE id='<id>';    -- paid_waiting_for_other, 1
     SELECT user_a_slot_confirmed_at, user_b_slot_confirmed_at FROM mutual_matches WHERE legacy_date_match_id='<id>'; -- payer's set
     ```

2. **Idempotency (the important one):**
   - Re-POST the same `charge.success` payload to the webhook (or re-call
     verify) **3×**. Assert:
     - `date_payments` still has one `paid` row (no duplicates).
     - `paid_user_count` does not exceed the real number of distinct paid users.

3. **Both paid:**
   - Pay as user A and user B. After the 2nd payment:
     ```sql
     SELECT payment_state FROM date_matches WHERE id='<id>'; -- both_paid
     ```
   - `mutual_matches.status` advances toward `upcoming` (full finalize in phase 7).

4. **Signature rejection:** POST to the webhook with a wrong/missing
   `x-paystack-signature` → `401`, no DB change.

5. **Amount tamper guard:** simulate a verify where Paystack reports a different
   amount → payment is **not** marked paid (assert row stays `pending`).

6. **Manual verify path:** call `POST /api/payments/verify` directly with a real
   test reference and confirm it produces the same end state as the webhook.

## Done when

- [ ] Webhook signature verified; bad signatures rejected.
- [ ] `markPaymentPaid` is idempotent (run 3× = same state).
- [ ] Amount/currency/metadata mismatches never mark paid.
- [ ] One payment → `paid_waiting_for_other`; two → `both_paid`.
- [ ] Payer's slot confirmation timestamp gets set.

## Rollback

Delete both routes. Keep `payment-service.ts` if phase 7 already imports it,
otherwise delete. No destructive data changes.
