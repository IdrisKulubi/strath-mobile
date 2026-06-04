# Phase 10 — Mobile UI (pay-to-confirm + states)

**Status:** ⬜ Not started
**Depends on:** Phases 3, 4, 6, 7 (and 9 for credit UI)
**User-visible:** Yes — this is the user-facing flow

## Goal

Turn the existing "Confirm slot" experience into "Pay KES 499 to confirm,"
open the hosted web payment page, deep-link back, and show the
waiting/both-paid/expired/credit states. All gated by `payments_enabled`
(fetched from the public flags endpoint).

## Files to edit / create

- `lib/feature-flags` (mobile) + public flags: expose `paymentsEnabled`.
  - Backend: add `paymentsEnabled` to `getPublicFeatureFlags()` (phase 1 left it
    out on purpose).
  - Mobile: read it where other public flags are read.
- `components/dates/meetup-slot-confirm.tsx` — primary CTA becomes Pay.
- `components/dates/confirmed-match-card.tsx` — show payment states.
- `app/(tabs)/dates.tsx` + `components/dates` — `ActionRequiredBanner` / modal copy.
- `components/home/date-hold-card.tsx` — Home CTA → Pay.
- `hooks/use-confirm-meetup-slot.ts` — handle `payment_required` response.
- New `hooks/use-payment.ts` — open checkout + poll `status`.
- `hooks/use-push-notifications.ts` — handle payment deep links/types.
- New `app/payments/` deep-link landing (for `strathspace://payments/...`).

## Flow on the device

1. User taps **Confirm** on their slot.
2. App calls `POST /api/me/match-hold/confirm-slot`.
   - If `reason: "payment_required"` → app receives `paymentToken` +
     `webPaymentUrl`.
3. App opens `${webPaymentUrl}?token=${paymentToken}` using **`expo-web-browser`
   `openAuthSessionAsync`** (preferred — it auto-closes on the
   `strathspace://payments/...` redirect and returns control to the app).
4. On return (success deep link or browser close):
   - Poll `GET /api/payments/status?dateMatchId=...` a few times.
   - Update UI: confirmed/waiting, or both_paid → "We're arranging this one."
5. Use `expo-web-browser` rather than raw WebView so Paystack + M-Pesa render in
   a real browser session (some bank/M-Pesa pages dislike embedded WebViews).

## CTA + state copy (mobile)

| State | Copy | Button |
|---|---|---|
| `awaiting_payment`, not paid | "Both of you said yes. Confirm your date with a one-time KES 499 setup fee." | **Pay KES 499 to confirm** |
| `paid_waiting_for_other` (you paid) | "You're confirmed. Waiting for the other person to confirm." | — |
| other paid, you haven't | "They've confirmed. Pay KES 499 to move forward." | **Pay KES 499** |
| `both_paid` | "You're both confirmed. We're arranging this one for you." | — |
| expired, nobody paid | "This match expired. New intros refresh soon." | — |
| expired, you paid / they didn't | "They didn't confirm in time. Keep your KES 499 as credit, or request a refund." | **Keep as credit** / **Request refund** |

> If the user has credit ≥ KES 499, also show **"Use KES 499 credit"** (calls
> `use-credit`, phase 9) next to the Pay button.

## Steps

1. Expose `paymentsEnabled` in public flags (backend) + read on mobile; when
   false, render the old free Confirm button unchanged.
2. Add `use-payment.ts`: `startPayment(dateMatchId)` → calls confirm-slot,
   detects `payment_required`, opens `openAuthSessionAsync`, then polls status.
3. Update `MeetupSlotConfirm` CTA + the Dates banner/modal + `DateHoldCard` CTA.
4. Register deep links: add `app/payments/success.tsx` + `app/payments/failed.tsx`
   (or handle in `resolveRoute`) so `strathspace://payments/...` lands cleanly.
5. Add credit + refund buttons (phase 9 endpoints) to the expired state.

## How to test

Use a **physical device or dev build** (deep links + browser auth session don't
work fully in web preview). Backend flag `payments_enabled = true`.

1. **Pay-to-confirm:** open a pending date → tap Confirm → web payment page opens
   in the in-app browser → pay with Paystack test M-Pesa/card → browser
   auto-closes via deep link → app shows "You're confirmed, waiting for the other
   person."
2. **Both paid:** repeat as the second test user → both apps show "We're
   arranging this one."
3. **Flag off:** set `payments_enabled = false` → Confirm works the old free way,
   no payment UI appears.
4. **Cancel/abandon:** start payment, close the browser without paying → app
   returns to the unpaid state (no false "confirmed").
5. **Status polling:** after returning, the card reflects the server state within
   a few seconds (not a stale local guess).
6. **Credit/refund UI:** force an expired one-paid match (phase 8) → app shows
   "Keep as credit / Request refund"; tapping each calls the right endpoint and
   updates.
7. **Use credit:** with ≥ KES 499 credit, "Use credit" confirms the date with no
   browser/payment step.

## Done when

- [ ] Confirm tap leads to a successful pay-and-return on a real device.
- [ ] All payment states render with the right copy + actions.
- [ ] Flag off = original free flow, no payment UI.
- [ ] Abandoned payment never shows as confirmed.
- [ ] Credit + refund actions work from the app.

## Rollback

Gate all new UI behind `paymentsEnabled`; turning the flag off hides everything.
