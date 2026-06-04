# Phase 9 — `refund-choice` + `use-credit` APIs

**Status:** ✅ Done
**Depends on:** Phases 5, 8
**User-visible:** Yes (via app in phase 10)

## Goal

Let a user who was auto-credited (phase 8) optionally **request a refund
instead**, and let any user **spend existing credit** on a future date setup fee
instead of paying again. Also handle the refund webhook events.

## Files to create

- `src/app/api/payments/refund-choice/route.ts`
- `src/app/api/payments/use-credit/route.ts`
- Extend `src/app/api/webhooks/paystack/route.ts` to handle
  `refund.processed` / `refund.failed`.
- Helpers in `payment-credit.ts`: `getCreditBalanceCents(userId)`,
  `spendCreditOnDateMatch(...)`, `handleRefundChoice(...)`.
- Shared apply path in `payment-apply.ts` (used by Paystack verify and use-credit).
- Mobile: `components/dates/payment-credit-actions.tsx` + hooks (DESIGN.md tokens).

## `POST /api/payments/refund-choice`

Body: `{ dateMatchId, choice: "credit" | "refund" }`. Only valid when: match
expired, this user paid, partner did not.

- `choice: "credit"` → no-op if phase 8 already auto-credited; just confirm.
- `choice: "refund"` →
  1. Reverse the auto-credit (mark the `user_credits` row `status = 'expired'` /
     insert an offsetting negative row) so the user isn't double-compensated.
  2. Mark the `date_payments` row `status = 'refund_requested'`,
     `refundReason = 'partner_did_not_pay'`.
  3. Initiate a Paystack refund (`POST /refund` with the transaction id) — or
     queue for admin if you prefer manual refunds initially.
  4. Final `refunded` state is set by the refund webhook.

## `POST /api/payments/use-credit`

Body: `{ dateMatchId }`. Used at the gate instead of paying.

1. Auth; user must be a participant of the match; match must be `awaiting_payment`
   /`paid_waiting_for_other` and not expired.
2. `getCreditBalance(userId) >= PAYMENT_CONFIG.amountCents`.
3. In a transaction:
   - Insert a **negative** `user_credits` row (−49900, reason `spent_on_date`).
   - Insert a `date_payments` row with `provider: "credit"`, `status: "paid"`,
     `paidAt: now`, a synthetic reference like `credit_<uuid>`.
   - Run the same post-payment advance as `markPaymentPaid` (set slot
     confirmation, recompute `paid_user_count`/`payment_state`, maybe finalize).
4. Idempotent: a user can only spend credit once per match.

## Webhook refund events

- `refund.processed` → find payment by reference/transaction, set
  `status = 'refunded'`, `refundedAt = now`.
- `refund.failed` → log + alert admin; leave as `refund_requested`.

## How to test

1. **Refund choice:**
   - Reach an auto-credited state (phase 8).
   - `POST /api/payments/refund-choice {choice:"refund"}` →
     ```sql
     SELECT status FROM date_payments WHERE date_match_id='<id>' AND user_id='<payer>'; -- refund_requested
     SELECT status FROM user_credits WHERE date_match_id='<id>'; -- auto credit reversed/expired
     ```
   - Simulate Paystack `refund.processed` webhook → row becomes `refunded`.
   - Choosing `credit` (default) leaves the credit active and payment `credited`.

2. **Use credit:**
   - Give a user KES 499 credit (from a prior expiry, or seed a `+49900` row).
   - New payable match → `POST /api/payments/use-credit {dateMatchId}`.
   - Assert: balance back to 0, a `provider:'credit'` paid `date_payments` row,
     slot confirmation set, `payment_state` advanced — **without** any Paystack
     call.
   - Insufficient balance → `409`. Calling twice → `409 already_paid`.

3. **Balance math:** `getCreditBalance` = SUM of `amountCents` for active/spent
   rows; confirm grants (+) and spends (−) net correctly.

## Done when

- [x] Refund choice flips credit → refund and initiates Paystack refund.
- [x] Refund webhook finalizes `refunded`.
- [x] Use-credit confirms a date without a new Paystack payment.
- [x] Credit balance never goes negative; no double-spend.

## Rollback

Delete the two routes; revert the webhook to phase 5 (drop refund handling).
Outstanding `refund_requested` rows should be settled manually first.
