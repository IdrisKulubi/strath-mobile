# Phase 12 — Admin payment visibility

**Status:** ✅ Done
**Depends on:** Phases 1, 5, 8, 9
**User-visible:** Admin only

## Goal

Give the ops team eyes and hands on payments: see who paid, manage refunds/
credits, and work the arrangement queue.

## Implemented

| Area | Files |
|---|---|
| Read helpers | `src/lib/actions/admin-payments.ts` |
| Admin refund | `src/lib/payments/admin-refund.ts` |
| Notes column | `date_matches.payment_admin_notes` + `drizzle/0024_payment_admin_notes.sql` |
| Queue UI | `src/app/admin/payments/page.tsx` |
| Match detail + actions | `src/app/admin/payments/[dateMatchId]/page.tsx`, `_actions.tsx` |
| Shared UI tokens | `src/components/admin/payments/payment-ui.tsx` |
| Nav | `src/components/admin/admin-sidebar.tsx` → Payments |

### Queues

- Awaiting payment (`awaiting_payment`)
- One paid (`paid_waiting_for_other`)
- Both paid (`both_paid`)
- Expired with credit (`expired` + active `user_credits`)
- Refund pending (`date_payments.status = refund_requested`)

### Reconciliation strip

- Collected (sum of `paid` payments)
- Active credits (sum of `active` user_credits)
- Refunds pending / completed counts

### Admin actions (server, `requireAdmin`)

- `adminIssueCredit` — insert `user_credits` with reason `admin_credit`
- `adminInitiateRefund` — `refund_requested` + Paystack refund API
- `adminFlagLowIntent` — bump `user.low_intent_score`
- `adminAddPaymentNote` — append timestamped line to `payment_admin_notes`

## How to test

1. Open `/admin/payments` as admin.
2. Open a match detail → verify both users' payment rows, references, state.
3. Issue manual credit → user balance reflects it in app status API.
4. Initiate refund on a paid row → status `refund_requested`; webhook completes to `refunded`.
5. Non-admin cannot access `/admin/payments` (redirect).
6. Reconciliation totals match manual SQL sums.

## Done when

- [x] Admin can see full payment status per match.
- [x] All five queues populate correctly.
- [x] Manual credit + refund actions work and are auditable (notes).
- [x] Actions are admin-guarded.

## Rollback

Admin-only — remove pages/actions without affecting user flow.
