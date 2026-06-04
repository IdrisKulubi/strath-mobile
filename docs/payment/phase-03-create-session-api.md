# Phase 3 — `create-session` API

**Status:** ⬜ Not started
**Depends on:** Phases 1, 2
**User-visible:** No (callable via curl)

## Goal

Authenticated endpoint that, given a `dateMatchId`, creates a pending payment
row and returns a Paystack `authorizationUrl` the client can open. This is the
first real HTTP surface and is fully testable with curl.

## Files to create

- `src/app/api/payments/create-session/route.ts`
- (optional) `src/lib/payments/payment-service.ts` for shared logic reused by
  later phases (recommended).

## Endpoint

```txt
POST /api/payments/create-session
Body: { "dateMatchId": "uuid" }
```

## Steps

1. **Auth + validation:**
   - `const session = await getSessionWithFallback(req)`; 401 if none.
   - Parse + zod-validate `dateMatchId`.

2. **Load + authorize the date match:**
   - Fetch `date_matches` by id.
   - 403 unless `session.user.id` is `userAId` or `userBId`.

3. **Payability checks (return 409 with a clear `reason` on failure):**
   - Feature flag on: `isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false)`.
   - `paymentState` ∈ `awaiting_payment | paid_waiting_for_other` (i.e. payment
     is currently expected). If `not_required`, the gate phase hasn't moved it
     yet — for isolated testing, allow a `?force=1` dev override OR move it
     manually (see test section).
   - `paymentDueBy` is in the future (window not expired).
   - This user has **not already paid** — check `date_payments` for a `paid`
     row for `(dateMatchId, userId)`; if found, 409 `already_paid`.

4. **Reuse or create the pending payment row:**
   - If a `pending` `date_payments` row exists for `(dateMatchId, userId)` with a
     still-valid reference, reuse it (idempotent re-entry). Otherwise:
   - `reference = buildPaymentReference(dateMatchId, userId)`.
   - Insert `date_payments` row: `status: "pending"`, `amountCents`,
     `paystackReference: reference`, `provider: "paystack"`.

5. **Initialize Paystack:**
   - `callbackUrl = ${WEB_PAYMENT_URL}/callback` (the web page handles redirect).
   - `metadata: { dateMatchId, userId, reference }`.
   - `email` = the user's email (needed by Paystack).
   - Call `initializeTransaction(...)`.

6. **Respond:**

   ```json
   { "authorizationUrl": "https://checkout.paystack.com/...", "reference": "strath_date_..." }
   ```

7. **Security must-haves:**
   - Never accept an amount from the client — always `PAYMENT_CONFIG.amountCents`.
   - Unique reference per attempt; never reuse a reference that's already `paid`.

## How to test

1. **Seed a payable match.** Create a mutual match via
   `src/scripts/create-test-mutual-match.ts`, then move its linked
   `date_matches` row into `awaiting_payment` for the test:

   ```sql
   UPDATE date_matches
   SET payment_state = 'awaiting_payment',
       payment_due_by = now() + interval '24 hours'
   WHERE id = '<dateMatchId>';
   ```

2. **Get a session token.** Log in as user A on the app or via the auth route;
   grab the bearer token (same token the mobile app sends).

3. **Call the endpoint:**

   ```bash
   curl -X POST http://localhost:3000/api/payments/create-session \
     -H "Authorization: Bearer <SESSION_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"dateMatchId":"<dateMatchId>"}'
   ```
   Expect `200` with `authorizationUrl` + `reference`.

4. **Open the `authorizationUrl`** in a browser → a real Paystack test checkout
   renders for KES 499.

5. **Negative tests:**
   - No token → `401`.
   - A `dateMatchId` the user is not part of → `403`.
   - Flag off → `409` / disabled response.
   - Window expired (`payment_due_by` in the past) → `409 expired`.
   - Call twice → second call **reuses** the same pending reference (no duplicate
     `date_payments` row). Verify with:
     ```sql
     SELECT count(*) FROM date_payments WHERE date_match_id='<id>' AND user_id='<uid>';
     -- still 1
     ```

## Done when

- [ ] Authorized user gets a working Paystack checkout URL.
- [ ] Exactly one pending `date_payments` row per `(match,user)`.
- [ ] Amount is server-controlled (KES 499), never client-supplied.
- [ ] All negative cases return correct status codes.

## Rollback

Delete the route file. The pending rows it created are harmless (they expire
with the match) but can be deleted.
