# Phase 12 — Admin payment visibility

**Status:** ⬜ Not started
**Depends on:** Phases 1, 5, 8, 9
**User-visible:** Admin only

## Goal

Give the ops team eyes and hands on payments: see who paid, manage refunds/
credits, and work the arrangement queue. Mirrors how existing admin date/meetup
tooling is built (`src/lib/actions/admin.ts`, `admin-meetup-slots.ts`, the
`/admin` web pages).

## What to add

1. **Payment panel on each date match** (in the existing admin date-match view):
   - Date match id, both users, each user's payment status + time.
   - Amount, provider (paystack/credit), Paystack reference + transaction id.
   - `payment_state`, `payment_due_by`.
   - Refund/credit status + internal notes.

2. **Admin queues** (read views, like `getAdminMeetupSlotTracking`):
   - Awaiting payment
   - One user paid (at risk)
   - Both paid / ready to arrange
   - Expired with credit granted
   - Refund requested

3. **Admin actions** (server actions in `admin.ts`, guarded by admin auth):
   - Mark match `being_arranged` / `confirmed` / `cancelled` (already exists for
     dates — extend to be payment-aware).
   - Issue manual credit (insert `user_credits` row, reason `admin_credit`).
   - Approve/initiate a refund (move `date_payments` → `refund_requested` →
     Paystack refund).
   - Flag a user as unserious (bump `low_intent_score`).
   - Add an internal note.

4. **Reconciliation read:** total collected, credits outstanding, refunds
   pending — a small stats strip.

## Steps

1. Add `getAdminPaymentsForDateMatch(dateMatchId)` and
   `getAdminPaymentQueues()` read helpers (join `date_payments` + `date_matches`
   + `user`).
2. Add server actions: `adminIssueCredit`, `adminInitiateRefund`,
   `adminFlagLowIntent`, `adminAddPaymentNote`.
3. Build/extend the admin UI page(s) under `/admin` to render the panel + queues.
4. Reuse existing admin auth/guards used by other `admin.ts` actions.

## How to test

1. **Visibility:** open the admin view for a match where A paid, B didn't →
   panel shows A `paid`, B `pending`, correct reference/amount.
2. **Queues:** seed matches in each state → each appears in the correct queue
   exactly once.
3. **Manual credit:** issue KES 499 credit to a user → `user_credits` row with
   reason `admin_credit`; the user's balance reflects it.
4. **Refund:** trigger admin refund on a paid row → `refund_requested`, Paystack
   refund initiated; refund webhook (phase 9) flips it to `refunded` and it moves
   out of the queue.
5. **Auth:** a non-admin session cannot call any of these actions (403/redirect).
6. **Stats:** collected/credits/refunds totals match a manual SQL sum.

## Done when

- [ ] Admin can see full payment status per match.
- [ ] All five queues populate correctly.
- [ ] Manual credit + refund actions work and are auditable.
- [ ] Actions are admin-guarded.

## Rollback

Admin-only and read-mostly — safe to remove the pages/actions without affecting
the user flow.
