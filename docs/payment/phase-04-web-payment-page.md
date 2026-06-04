# Phase 4 — Hosted `/payments` web page + callback

**Status:** ✅ Complete
**Depends on:** Phases 2, 3
**User-visible:** Yes (a web page; not wired into the app until phase 10)

## Goal

A page on the Next.js site the user lands on to pay, and a callback route
Paystack redirects to after payment. The page never exposes raw ids — it takes a
signed token (phase 2). This lets you complete a full pay-in-browser flow before
touching the mobile app.

## Files to create

- `src/app/payments/page.tsx` — the payment landing page (`/payments?token=...`).
- `src/app/payments/callback/page.tsx` — post-Paystack redirect handler.
- (page calls `create-session` from phase 3 and `verify` from phase 5.)

## Page: `/payments?token=<signed_payment_token>`

1. **Validate token** server-side (`verifyPaymentToken`); if invalid/expired,
   render a friendly "This payment link expired — reopen from the app" state.
2. **Load payment summary** for `{ dateMatchId, userId }` (amount, partner first
   name, slot date, current `paymentState`).
3. **Render the framing** (NOT subscription language):

   ```txt
   Title:    Confirm your date
   Subtitle: A one-time Date Setup Fee helps us coordinate your date and keep
             StrathSpace serious. It is not a subscription.
   Amount:   KES 499
   Includes: Date coordination by StrathSpace · Confirmation with both people ·
             Venue + time scheduling · Pre-date support
   Button:   Pay KES 499 to confirm
   Footer:   By paying you agree to StrathSpace's Terms & Date Setup Policy.
   ```

4. **On "Pay":** call `POST /api/payments/create-session` → redirect the browser
   to the returned `authorizationUrl`.

5. **If already paid:** show "You're confirmed — waiting for the other person"
   and a "Return to app" deep-link button (`APP_PAYMENT_RETURN_URL`).

## Callback: `/payments/callback?reference=<reference>`

Paystack redirects here after checkout. **The callback is UX only — never trust
it for state.** Steps:

1. Read `reference` from query.
2. Call `POST /api/payments/verify` (phase 5) to confirm server-side.
3. Show success or failure.
4. Attempt to deep-link back to the app:
   - success → `strathspace://payments/success?reference=<reference>`
   - failure → `strathspace://payments/failed?reference=<reference>`
5. Fallback copy if the deep link doesn't fire: "Payment received. You can return
   to the StrathSpace app."

## Steps

1. Build `/payments/page.tsx` as a client component that fetches a small summary
   endpoint (you can reuse phase 6 `status` once it exists, or inline a minimal
   summary read here gated by the token).
2. Build `/payments/callback/page.tsx`.
3. Style with the existing web design system (Tailwind + the site's components).
4. Add a `Terms / Date Setup Policy` link (can be a placeholder route for now).

> Until phase 5 exists, the callback's verify call will 404 — that's expected.
> You can test the page render + create-session redirect in this phase and the
> verify leg in phase 5.

## How to test

1. **Generate a token** (tsx, using phase 2 helper) for a seeded payable match:

   ```bash
   PAYMENT_TOKEN_SECRET=... npx tsx -e "import('./src/lib/payments/payment-token.ts').then(m=>console.log(m.signPaymentToken({dateMatchId:'<id>',userId:'<uid>'})))"
   ```

2. **Open** `http://localhost:3000/payments?token=<token>`:
   - Correct amount (KES 499), partner name, slot date render.
   - Framing copy shows "Date Setup Fee", no "subscription/premium" words.

3. **Click "Pay KES 499 to confirm"** → browser redirects to Paystack test
   checkout. Complete payment with a Paystack **test card / test M-Pesa**.

4. **Paystack redirects to** `/payments/callback?reference=...`:
   - Shows a success state (verify wiring completes in phase 5; for now confirm
     the reference is read and displayed and the deep-link button appears).

5. **Expired/invalid token** → friendly error, no ids leaked in the URL or page
   source.

## Done when

- [x] `/payments` renders correct summary from a signed token only.
- [x] "Pay" reaches Paystack checkout via create-session (with `paymentToken` body).
- [x] Callback reads the reference and shows success/failure + deep-link button.
- [x] No raw `userId`/`dateMatchId` in any URL.
- [x] Copy uses "Date Setup Fee", avoids subscription/unlock language.

**Also shipped:** `GET /api/payments/checkout?token=...`, token auth on `create-session`, `print-payment-page-url.ts` helper.

## Rollback

Delete the two page files. No state is written by the page itself.
