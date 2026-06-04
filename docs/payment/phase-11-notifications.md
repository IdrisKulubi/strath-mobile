# Phase 11 — Payment notifications

**Status:** ✅ Done
**Depends on:** Phases 5, 7, 8, 9
**User-visible:** Yes (push notifications)

## Goal

Push the right nudge at the right moment so payments actually complete:
"you both said yes — confirm," "they paid, your turn," "both confirmed,"
"expiring soon," and credit/refund outcomes.

## Implemented

| Area | Files |
|---|---|
| Type constants | `src/lib/notification-types.ts`, `strath-mobile/lib/services/notifications-service.ts` |
| Push helpers | `src/lib/services/payment-push-notifications-service.ts` |
| Slot assigned → pay nudge | `meetup-push-notifications-service.ts` (`sendPaymentRequiredPushes` when flag on) |
| Partner paid / both paid | `payment-apply.ts` → `runPaidParticipantSideEffects` |
| Expiring (~6h) | `meetup-confirm-reminder-service.ts` (payment branch + `slotConfirmReminderSentAt`) |
| Expired + credit | `payment-expiry.ts` → `notifyPaymentMatchExpired` |
| Refund | `payment-refund.ts` → `sendRefundCompletedPush` on `refund.processed` |
| Mobile routing | `hooks/use-push-notifications.ts` |

## New notification types

```txt
PAYMENT_REQUIRED        // both said yes → pay to confirm
PAYMENT_PARTNER_PAID    // partner paid, your turn
PAYMENT_BOTH_PAID       // both confirmed, arranging
PAYMENT_EXPIRING        // window closing soon
PAYMENT_EXPIRED         // match expired, payment not completed
CREDIT_GRANTED          // KES 499 credit added
REFUND_COMPLETED        // refund done
```

## Where each fires

| Type | Trigger point |
|---|---|
| `PAYMENT_REQUIRED` | `sendMeetupSlotAssignedPushes` when `paymentsEnabled` + `dateMatchId` (mutual creation / backfill). |
| `PAYMENT_PARTNER_PAID` | `runPaidParticipantSideEffects` when `paidCount === 1` and flag on. |
| `PAYMENT_BOTH_PAID` | `runPaidParticipantSideEffects` when `paidCount >= 2` and flag on. |
| `PAYMENT_EXPIRING` | `runMeetupConfirmReminders` ~6h before deadline for unpaid users when payments on. |
| `PAYMENT_EXPIRED` | `runPaymentExpirySweep` after each expired match. |
| `CREDIT_GRANTED` | Same sweep when one-paid credit is granted. |
| `REFUND_COMPLETED` | `markPaymentRefundedFromWebhook` on first `refunded` transition. |

## Copy

```txt
PAYMENT_REQUIRED   → "You both said yes 🎉  Confirm your date with a KES 499 setup fee."
PAYMENT_PARTNER_PAID → "They've confirmed. Your turn — pay KES 499 to lock it in."
PAYMENT_BOTH_PAID  → "You're both confirmed. We're arranging this one for you."
PAYMENT_EXPIRING   → "Your date confirmation expires soon. Confirm to keep it."
PAYMENT_EXPIRED    → "This match expired because confirmation wasn't completed in time."
CREDIT_GRANTED     → "You've got KES 499 StrathSpace credit toward your next date."
REFUND_COMPLETED   → "Your KES 499 refund has been processed."
```

All payment pushes carry `data: { type, route: "/(tabs)/dates", dateId }`.

## How to test

1. **Partner-paid:** pay as A → assert user B receives `PAYMENT_PARTNER_PAID`.
2. **Both-paid:** pay as B → both users get `PAYMENT_BOTH_PAID`.
3. **Expiring:** set `payment_due_by` ~5h out, run meetup-confirm-reminders cron → unpaid user gets `PAYMENT_EXPIRING` once.
4. **Expired + credit:** run payment-expiry cron → payer gets `PAYMENT_EXPIRED` + `CREDIT_GRANTED`.
5. **Refund:** trigger `refund.processed` webhook → `REFUND_COMPLETED`.
6. **Mirror check:** `payment-push-notifications.test.ts` asserts backend/mobile type strings match.

## Done when

- [x] Each event fires at the right transition, once.
- [x] Taps deep-link to the Dates tab.
- [x] Reminder is idempotent (`slotConfirmReminderSentAt`).
- [x] Backend + mobile type constants match.

## Rollback

Remove the `sendPushNotification` calls; the constants are harmless if unused.
