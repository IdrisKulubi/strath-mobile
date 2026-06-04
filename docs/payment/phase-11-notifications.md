# Phase 11 — Payment notifications

**Status:** ⬜ Not started
**Depends on:** Phases 5, 7, 8, 9
**User-visible:** Yes (push notifications)

## Goal

Push the right nudge at the right moment so payments actually complete:
"you both said yes — confirm," "they paid, your turn," "both confirmed,"
"expiring soon," and credit/refund outcomes.

## Files to edit

- `src/lib/notification-types.ts` (backend) — add new type constants.
- `strath-mobile/lib/services/notifications-service.ts` (mobile) — mirror them.
- Call `sendPushNotification(token, { title, body, data: { type, dateId, ... } })`
  from the relevant places (verify/webhook, expiry cron).
- `hooks/use-push-notifications.ts` (mobile) — route payment taps to
  `/(tabs)/dates`.

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
| `PAYMENT_REQUIRED` | When a mutual match becomes `awaiting_payment` (mutual creation, flag on). |
| `PAYMENT_PARTNER_PAID` | In `markPaymentPaid` when `paid_user_count` goes 0→1 (notify the other user). |
| `PAYMENT_BOTH_PAID` | In `markPaymentPaid` when it reaches `both_paid` (notify both). |
| `PAYMENT_EXPIRING` | A reminder cron (can extend the existing `meetup-confirm-reminders`) ~6h before `payment_due_by`. |
| `PAYMENT_EXPIRED` | In the expiry cron (phase 8). |
| `CREDIT_GRANTED` | In the expiry cron when a credit is granted. |
| `REFUND_COMPLETED` | In the refund webhook (phase 9). |

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

1. **Partner-paid:** pay as A → assert user B receives `PAYMENT_PARTNER_PAID`
   (check Expo push logs / device). Tapping it lands on the Dates tab.
2. **Both-paid:** pay as B → both users get `PAYMENT_BOTH_PAID`.
3. **Expiring:** set `payment_due_by` ~5h out, run the reminder cron → the unpaid
   user gets `PAYMENT_EXPIRING` exactly once (idempotent — re-run sends nothing).
4. **Expired + credit:** force expiry (phase 8) → payer gets `PAYMENT_EXPIRED` +
   `CREDIT_GRANTED`.
5. **No token users:** users without a `pushToken` are skipped without error.
6. **Mirror check:** the type strings match exactly between backend
   `notification-types.ts` and mobile `notifications-service.ts`.

## Done when

- [ ] Each event fires at the right transition, once.
- [ ] Taps deep-link to the Dates tab.
- [ ] Reminder is idempotent (uses a "sent" marker like `slotConfirmReminderSentAt`).
- [ ] Backend + mobile type constants match.

## Rollback

Remove the `sendPushNotification` calls; the constants are harmless if unused.
