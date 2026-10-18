# StrathSpace Payment Flow — Paystack Date Confirmation Pack

## Document Purpose

This document explains how StrathSpace uses a **Date Confirmation Pack** via **Paystack** to keep the matching flow intentional.

The goal is to make dating more serious and reduce ghosting. Users do not pay to browse, swipe, chat, or unlock people. They only see payment **after they have a mutual match** and need to confirm before StrathSpace sets up a real-world date.

**Current product model (locked):**

```txt
Pay KSh 499 once → get 2 date confirmations.
A confirmation is only used when both people confirm and date setup proceeds.
```

For the phased engineering plan to implement this model, see
[`payment/two-confirmation-pack.md`](./payment/two-confirmation-pack.md).

> **Note:** Older sections below may still describe the legacy per-date fee (KSh 499 per
> person per date). Where they conflict with the pack model above, the pack model wins.
> The engineering execution plan in [`payment/README.md`](./payment/README.md) tracks
> rollout status.

---

## 1. Core Idea

StrathSpace will introduce a **commitment fee** before arranging a real date.

The payment is not a subscription.

The payment is not for unlocking digital features.

The payment is for:

- Confirming that the user is serious
- Reducing unserious matches
- Helping StrathSpace coordinate the actual date
- Protecting users from time-wasters

Recommended name everywhere:

```txt
Date Confirmation Pack
```

(or "date confirmations" when referring to the balance)

User-facing screen title:

```txt
Confirm your match
```

Avoid using:

```txt
Subscription
Premium
Pay to unlock match
Pay to chat
Pay to view profile
```

---

## 2. Payment Amount — Confirmation Pack

Launch amount:

```txt
KSh 499 per person for a pack of 2 date confirmations
```

Each person buys their own pack. Both people still need to confirm before a date is set up.

Effective cost per successful date (if both confirmations are used):

```txt
KSh 499 ÷ 2 = ~KSh 250 per confirmed date per person
```

A confirmation is **not** spent when:

- The user pays but their match does not confirm in time
- The match expires before both people confirm
- Date setup does not proceed

A confirmation **is** spent when:

- Both users confirm within the window **and**
- `tryFinalizeConfirmedMeetup` succeeds (date setup proceeds)

Environment variables:

```env
DATE_CONFIRMATION_PACK_AMOUNT_KES=499
DATE_CONFIRMATION_PACK_AMOUNT_CENTS=49900
DATE_CONFIRMATION_PACK_SIZE=2
DATE_CONFIRMATION_UNIT_CENTS=24950
DATE_PAYMENT_WINDOW_HOURS=24
```

> **Paystack:** send `49900` for the pack purchase. Confirmation balance is tracked in
> `user_credits` (see [`payment/two-confirmation-pack.md`](./payment/two-confirmation-pack.md)).

Legacy env names still in code until migration:

```env
DATE_CONFIRMATION_AMOUNT_KES=499
DATE_CONFIRMATION_AMOUNT_CENTS=49900
```

---

## 3. Why Paystack

StrathSpace will use **Paystack** because the payment is for an offline service, not an in-app digital subscription.

This payment is for real-world date coordination after mutual confirmation.

Paystack is suitable because it supports:

- M-Pesa/mobile money
- Card payments
- One-time checkout
- Backend payment verification
- Webhook-based confirmation
- Refund and credit workflows

---

## 4. Website Payment Route

The backend and landing page are already in the same web project/repo.

So we will add the payment page inside the existing web/backend project.

Payment page URL:

```txt
https://strathspace.com/payments
```

If the production domain is currently written as `strutspace.com`, confirm the correct final domain before deployment. The intended StrathSpace payment route should be:

```txt
/payments
```

Recommended full URL format:

```txt
https://strathspace.com/payments?token=<signed_payment_token>
```

Do not expose raw `userId` and `dateMatchId` in production URLs unless absolutely necessary.

Avoid this in production:

```txt
/payments?dateMatchId=<id>&userId=<id>
```

Use a signed token instead.

---

## 5. High-Level Flow

```txt
User receives curated match
        ↓
Both users choose Open to Meet
        ↓
Mutual match / date match is created
        ↓
System assigns slot (Wed/Sat) + confirm-by deadline
        ↓
"Confirm your match" screen appears          ← payment only shown here
        ↓
Does user have confirmation credit?
   ├─ Yes → use 1 credit, confirm slot (no Paystack)
   └─ No  → Pay KSh 499 → grant 2 confirmations → use 1 for this match
        ↓
Wait for partner to confirm (same flow for them)
        ↓
Both confirmed + both have paid/used credit
        ↓
Spend 1 confirmation each → StrathSpace arranges the date
        ↓
Next match: user with 1 credit left skips Paystack
        ↓
If window expires before both confirm → match cancels, unused credits stay
```

---

## 6. When Payment Is Required

Payment UI appears **only after a mutual match exists** and the user reaches the
**Confirm your match** step (slot confirmation screen).

Prerequisites before payment is shown:

1. User A and User B are matched.
2. Both users chose `Open to Meet`.
3. A `date_match` row exists with an assigned slot and `slotConfirmBy` deadline.

At that point, for each user:

```txt
If confirmation_balance >= 1 → show "Confirm" (uses 1 credit)
If confirmation_balance = 0  → show "Pay KSh 499" (pack grants 2, uses 1)
```

Users never see payment on signup, browse, or before they have a match.

---

## 7. Payment Window

Once payment is required, both users have a limited time to pay.

Recommended payment window:

```txt
24 hours
```

Set:

```txt
payment_due_by = now + 24 hours
```

If payment is not completed before the deadline, the match is cancelled/expired.

This prevents one person from blocking the other person from meeting new matches.

---

## 8. Match Termination Logic

If the confirmation window expires and both users have not confirmed:

- The match is cancelled in the backend.
- Both users are released back into the matchmaking pool.
- **Unused confirmation credits stay on each user's balance** (nothing is spent).
- The person who failed to confirm may receive a low-intent flag.

If one user confirmed (paid or used credit) but the other did not:

- Cancel the match and release both users.
- **Restore** the confirming user's reserved confirmation (mark credit `active` again).
- Flag the non-confirming user as low intent.
- No refund flow needed if the confirmation was never spent.

If a user paid KSh 499 for a pack but never used any confirmation on that match,
they still have 2 confirmations available for future matches.

---

## 9. Main Payment Scenarios

### Scenario A — Nobody Confirms

If neither user confirms before the deadline:

```txt
payment_state = expired
date_match.status = cancelled
```

Actions:

- Cancel the match.
- Release both users back to matchmaking.
- No confirmations spent; balances unchanged.

---

### Scenario B — One User Confirms, Other Does Not

If User A confirms (paid or used credit) but User B does not before the deadline:

```txt
payment_state = expired
date_match.status = cancelled
```

Actions:

- Cancel the match.
- Release both users back to matchmaking.
- **Restore** User A's reserved confirmation (if one was held for this match).
- Mark User B as low intent internally.

User A should see:

```txt
They did not confirm in time.
Your confirmation was not used. You still have X date confirmations left.
```

---

### Scenario C — Both Users Confirm (Pack Model)

If both users confirm before the deadline (each paid or used credit):

```txt
payment_state = both_paid
date_match.status = scheduled (after tryFinalizeConfirmedMeetup)
```

Actions:

- Spend 1 confirmation from each user's balance.
- Notify both users.
- StrathSpace arranges the date.

User copy:

```txt
You're both confirmed.
We're arranging this one for you.
```

If a user had 2 confirmations before this match, they now have 1 left for the next one.

---

### Scenario D — One User Pays Then Changes Mind

If a user pays and later changes their mind:

- Do not automatically refund.
- User must contact support.
- Admin decides whether to refund, credit, or reject the request.

---

### Scenario E — StrathSpace Cannot Arrange the Date

If both users paid but StrathSpace cannot arrange the date because of operational issues:

- Offer refund or credit to both users.
- Admin should record the reason.

---

### Scenario F — Safety Issue

If there is a safety issue:

- Pause the date.
- Admin reviews the case.
- Refund or credit may be issued manually.
- The other user may be flagged, suspended, or removed depending on severity.

---

## 10. Payment States

Recommended payment states:

```txt
not_required
awaiting_payment
paid_waiting_for_other
both_paid
being_arranged
confirmed
completed
cancelled
expired
refund_requested
refunded
credited
```

Meaning:

| State | Meaning |
|---|---|
| `not_required` | Payment is not needed yet |
| `awaiting_payment` | Both users need to pay |
| `paid_waiting_for_other` | One user has paid, waiting for the other |
| `both_paid` | Both users have paid successfully |
| `being_arranged` | Admin is arranging the date |
| `confirmed` | Date has been arranged and confirmed |
| `completed` | Date happened successfully |
| `cancelled` | Date was cancelled |
| `expired` | Payment window expired |
| `refund_requested` | User requested refund |
| `refunded` | Refund was completed |
| `credited` | Payment was converted into StrathSpace credit |

---

## 11. Date Match State Flow

When both users confirm they want to meet:

```txt
payment_state = awaiting_payment
payment_due_by = now + 24 hours
```

If one user pays:

```txt
payment_state = paid_waiting_for_other
```

If both users pay:

```txt
payment_state = both_paid
status = ready_to_arrange
```

Then:

```txt
payment_state = being_arranged
status = being_arranged
```

If deadline passes and payment is incomplete:

```txt
payment_state = expired
status = cancelled
```

---

## 12. Database Changes

### 12.1 Update `date_matches`

Add payment-related fields:

```sql
ALTER TABLE date_matches
ADD COLUMN payment_state text NOT NULL DEFAULT 'not_required';

ALTER TABLE date_matches
ADD COLUMN payment_due_by timestamp;

ALTER TABLE date_matches
ADD COLUMN payment_amount_cents integer DEFAULT 50000;

ALTER TABLE date_matches
ADD COLUMN payment_currency text DEFAULT 'KES';

ALTER TABLE date_matches
ADD COLUMN paid_user_count integer NOT NULL DEFAULT 0;
```

---

### 12.2 Create `date_payments`

```sql
CREATE TABLE date_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  date_match_id uuid NOT NULL REFERENCES date_matches(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'KES',

  provider text NOT NULL DEFAULT 'paystack',
  paystack_reference text UNIQUE NOT NULL,
  paystack_transaction_id text,
  paystack_authorization_code text,

  status text NOT NULL DEFAULT 'pending',

  paid_at timestamp,
  refunded_at timestamp,
  credited_at timestamp,
  refund_reason text,

  raw_verify_payload jsonb,
  raw_webhook_payload jsonb,

  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX date_payments_user_match_unique
ON date_payments(date_match_id, user_id);

CREATE INDEX date_payments_reference_idx
ON date_payments(paystack_reference);

CREATE INDEX date_payments_status_idx
ON date_payments(status);
```

Payment statuses:

```txt
pending
paid
failed
refund_requested
refunded
credited
cancelled
```

---

### 12.3 Create `user_credits`

```sql
CREATE TABLE user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'KES',

  reason text NOT NULL,
  date_match_id uuid REFERENCES date_matches(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES date_payments(id) ON DELETE SET NULL,

  status text NOT NULL DEFAULT 'active',
  used_at timestamp,

  created_at timestamp NOT NULL DEFAULT now()
);
```

Credit reasons:

```txt
partner_did_not_pay
admin_credit
date_credit
promo
manual_adjustment
strathspace_could_not_arrange
```

---

### 12.4 Optional: Add Low-Intent Flags

To track unserious behavior:

```sql
ALTER TABLE users
ADD COLUMN low_intent_score integer NOT NULL DEFAULT 0;
```

When a user fails to pay after confirming interest:

```txt
low_intent_score += 1
```

This score can later affect matchmaking priority.

---

## 13. Backend API Routes

Recommended Next.js App Router route structure:

```txt
/app/api/payments/create-session/route.ts
/app/api/payments/verify/route.ts
/app/api/payments/status/route.ts
/app/api/payments/refund-choice/route.ts
/app/api/payments/use-credit/route.ts
/app/api/webhooks/paystack/route.ts
/app/api/cron/payment-expiry/route.ts
```

---

## 14. Create Payment Session

Endpoint:

```txt
POST /api/payments/create-session
```

Purpose:

Create a Paystack checkout transaction for the Date Confirmation Fee.

Input:

```json
{
  "dateMatchId": "uuid"
}
```

Backend must:

1. Verify the user is authenticated.
2. Verify the user belongs to the date match.
3. Verify the match is payable.
4. Verify the payment window has not expired.
5. Verify the user has not already paid.
6. Generate a unique Paystack reference.
7. Create a pending payment row.
8. Initialize Paystack transaction.
9. Return Paystack authorization URL.

Response:

```json
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "strath_date_dm83k_user29x_849201"
}
```

---

## 15. Paystack Payment Page

Route:

```txt
/payments
```

Recommended URL:

```txt
/payments?token=<signed_payment_token>
```

The page should:

1. Validate the token.
2. Fetch payment details.
3. Show the payment summary.
4. Show the amount.
5. Let the user start Paystack checkout.
6. Redirect the user back after payment.

Page title:

```txt
Confirm your date
```

Subtitle:

```txt
A small commitment fee helps us keep StrathSpace intentional and reduce time-wasters.
```

Amount:

```txt
KES 500
```

What it includes:

```txt
Date coordination by StrathSpace
Confirmation with both people
Pre-date support
Manual scheduling by our team
```

Button:

```txt
Pay KES 500 to confirm
```

Footer:

```txt
By paying, you agree to StrathSpace's Terms and Date Confirmation Policy.
```

---

## 16. Paystack Callback

Callback route:

```txt
GET /payments/callback?reference=<reference>
```

Purpose:

Handle the user after Paystack redirects them back to StrathSpace.

Important:

The callback is for user experience only.

Do not trust the callback alone.

The backend must still verify the transaction with Paystack.

Callback flow:

1. Receive `reference`.
2. Call `/api/payments/verify`.
3. Show success/failure result.
4. Deep link user back to the app.

Success deep link:

```txt
strathspace://payments/success?reference=<reference>
```

Failure deep link:

```txt
strathspace://payments/failed?reference=<reference>
```

Fallback text if deep link fails:

```txt
Payment received. You can return to the StrathSpace app.
```

---

## 17. Verify Payment

Endpoint:

```txt
POST /api/payments/verify
```

Input:

```json
{
  "reference": "strath_date_dm83k_user29x_849201"
}
```

Backend must:

1. Find payment by reference.
2. Call Paystack verify transaction API.
3. Confirm transaction status is `success`.
4. Confirm amount is exactly `50000`.
5. Confirm currency is `KES`.
6. Confirm user and date match metadata match.
7. Mark payment as `paid`.
8. Update date match payment state.
9. Trigger notifications.

Response:

```json
{
  "success": true,
  "paymentState": "paid_waiting_for_other",
  "currentUserPaid": true,
  "otherUserPaid": false
}
```

---

## 18. Payment Status Endpoint

Endpoint:

```txt
GET /api/payments/status?dateMatchId=<id>
```

Purpose:

Allow app to refresh payment state after returning from the web payment page.

Response:

```json
{
  "dateMatchId": "uuid",
  "paymentState": "paid_waiting_for_other",
  "currentUserPaid": true,
  "otherUserPaid": false,
  "amount": 500,
  "currency": "KES",
  "paymentDueBy": "timestamp"
}
```

---

## 19. Paystack Webhook

Endpoint:

```txt
POST /api/webhooks/paystack
```

Purpose:

Receive trusted payment events from Paystack.

Webhook must verify Paystack signature before processing.

Handle events:

```txt
charge.success
refund.processed
refund.failed
```

Webhook rules:

- Webhook is the source of truth.
- Processing must be idempotent.
- If a payment was already marked as paid, do not duplicate it.
- Store the raw webhook payload.

---

## 20. Refund or Credit Choice

Endpoint:

```txt
POST /api/payments/refund-choice
```

Purpose:

Allow a user who paid to choose refund or credit when the other person failed to pay.

Input:

```json
{
  "dateMatchId": "uuid",
  "choice": "refund"
}
```

Or:

```json
{
  "dateMatchId": "uuid",
  "choice": "credit"
}
```

Only available when:

- Match expired.
- Current user paid.
- Other user did not pay.

If user chooses credit:

1. Create `user_credits` row.
2. Mark payment as `credited`.
3. Notify user.

If user chooses refund:

1. Mark payment as `refund_requested`.
2. Admin or backend initiates Paystack refund.
3. Mark as `refunded` after webhook confirmation.

---

## 21. Use Credit

Endpoint:

```txt
POST /api/payments/use-credit
```

Purpose:

Allow a user to use existing StrathSpace credit on a future date confirmation.

Input:

```json
{
  "dateMatchId": "uuid"
}
```

Backend must:

1. Check available credit balance.
2. Confirm credit is at least KES 500.
3. Mark user as paid for the new date match.
4. Create payment row with provider `credit`.
5. Update date match payment state.

---

## 22. Cron Job — Payment Expiry

Endpoint:

```txt
POST /api/cron/payment-expiry
```

Run every:

```txt
15 minutes
```

Query:

```sql
SELECT *
FROM date_matches
WHERE payment_state IN ('awaiting_payment', 'paid_waiting_for_other')
AND payment_due_by < now();
```

For each expired match:

### If nobody paid

- Cancel match.
- Set `payment_state = expired`.
- Release both users back to matchmaking.

### If one person paid

- Cancel match.
- Set `payment_state = expired`.
- Ask paying user to choose refund or credit.
- Flag non-paying user as low intent.
- Release both users back to matchmaking.

---

## 23. App UI States

### Payment Required

```txt
Confirm your date

Both of you said yes. Pay the Date Confirmation Fee so we can arrange the next step.
```

Button:

```txt
Pay KES 500
```

---

### Waiting for Other Person

```txt
You're confirmed.
Waiting for the other person to confirm.
```

---

### Other Person Paid

```txt
They've confirmed.
Pay KES 500 to move forward.
```

---

### Both Paid

```txt
You're both confirmed.
We're arranging this one for you.
```

---

### Match Expired — Nobody Paid

```txt
This match expired.
Daily matches refresh soon.
```

---

### Match Expired — Other Person Did Not Pay

```txt
They did not confirm in time.
Would you like a refund or credit for your next date?
```

Buttons:

```txt
Keep as credit
Request refund
```

---

## 24. Admin Dashboard Requirements

Admin should see a payment section inside each date match.

Show:

- Date match ID
- User A payment status
- User B payment status
- Amount paid
- Payment provider
- Paystack reference
- Payment time
- Refund/credit status
- Payment deadline
- Internal notes

Admin actions:

- Mark as being arranged
- Mark as confirmed
- Cancel date
- Issue credit
- Request refund
- Add internal note
- Flag unserious user

Admin queues:

```txt
Awaiting payment
One user paid
Both paid / ready to arrange
Expired with refund or credit required
Refund requested
```

---

## 25. Notifications

Add notification events:

```txt
payment_required
partner_paid
both_paid
payment_expiring
payment_expired
credit_granted
refund_requested
refund_completed
```

Example copy:

### Payment Required

```txt
You both said yes. Confirm your date with KES 500.
```

### Partner Paid

```txt
They've confirmed. Your turn to confirm the date.
```

### Both Paid

```txt
You're both confirmed. We're arranging this one.
```

### Payment Expiring

```txt
Your date confirmation expires soon.
```

### Payment Expired

```txt
This match expired because payment was not completed in time.
```

### Credit Granted

```txt
You've received KES 500 credit toward your next confirmed date.
```

---

## 26. Security Requirements

Required security rules:

- Never trust frontend payment success.
- Always verify Paystack transaction server-side.
- Verify Paystack webhook signature.
- Use unique payment references.
- Make payment verification idempotent.
- Users can only pay for their own date match.
- Users cannot pay twice for the same match.
- Amount must match exactly.
- Currency must match exactly.
- Signed payment tokens must expire.
- Payment state transitions must be protected.
- Do not allow expired matches to receive new payments.

---

## 27. Payment Reference Format

Recommended format:

```txt
strath_date_<shortDateMatchId>_<shortUserId>_<random>
```

Example:

```txt
strath_date_dm83k_ju29x_849201
```

References must be unique.

---

## 28. Environment Variables

Backend:

```env
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

PAYMENT_TOKEN_SECRET=your_secure_token_secret

DATE_CONFIRMATION_AMOUNT_CENTS=50000
DATE_CONFIRMATION_AMOUNT_KES=500
DATE_PAYMENT_WINDOW_HOURS=24

APP_DEEP_LINK_SCHEME=strathspace://
APP_PAYMENT_RETURN_URL=strathspace://payments/callback
WEB_PAYMENT_URL=https://strathspace.com/payments
```

Mobile/frontend:

```env
EXPO_PUBLIC_WEB_PAYMENT_URL=https://strathspace.com/payments
```

---

## 29. Feature Flag

Add a feature flag:

```txt
payments_enabled
```

When disabled:

- Payment UI is hidden.
- Payment APIs return disabled response.
- Old free flow continues.

Rollout plan:

```txt
Phase 1: Code deployed, payments_enabled = false
Phase 2: Staff testing only
Phase 3: Limited user rollout
Phase 4: Public rollout
```

---

## 30. App Store / Play Store Positioning

Because this payment is for offline coordination, describe it clearly as:

```txt
Date Confirmation Fee for offline date coordination.
```

Do not describe it as:

```txt
Unlocking matches
Unlocking chat
Unlocking profiles
Premium access
Subscription
```

Recommended review note:

```txt
StrathSpace charges a one-time Date Confirmation Fee only after two users mutually agree to meet and confirm after the vibe-check step. The fee is for real-world date coordination by the StrathSpace team, including arranging the date time and venue. It is not a subscription and does not unlock browsing, chat, matches, or digital content.
```

---

## 31. Analytics Events

Track:

```txt
payment_required
payment_page_opened
payment_initiated
payment_success
payment_failed
payment_waiting_for_other
payment_both_paid
payment_expired
refund_requested
credit_selected
credit_used
date_arrangement_started
```

Main funnel:

```txt
mutual match
→ vibe-check completed
→ both confirmed
→ payment required
→ one paid
→ both paid
→ date arranged
→ date completed
```

---

## 32. Implementation Order

Recommended build order:

1. Add database migrations.
2. Add payment states to date matches.
3. Add feature flag.
4. Add Paystack client helper.
5. Build `/payments` web page.
6. Build create-session API.
7. Build verify API.
8. Build webhook API.
9. Build payment status API.
10. Build refund/credit choice API.
11. Build credit ledger.
12. Add mobile app payment UI states.
13. Add deep link handling.
14. Add payment expiry cron.
15. Add admin payment dashboard.
16. Test complete flow.
17. Enable feature flag gradually.

---

## 33. Testing Checklist

Test before launch:

- Both users pay successfully.
- One user pays and the other does not.
- Nobody pays.
- Payment expires after 24 hours.
- Paid user chooses credit.
- Paid user requests refund.
- User tries to pay twice.
- User opens payment page with expired token.
- User opens payment page after match expired.
- Paystack callback succeeds.
- Paystack webhook succeeds.
- App deep link works.
- Admin sees both-paid match.
- Admin sees refund/credit queue.

---

## 34. Final Product Summary

The final flow should feel like this:

```txt
Join StrathSpace for free.
Receive curated matches for free.
Say Open to Meet for free.
When you get a match, confirm before we set up the date.
Pay KSh 499 once for 2 date confirmations (only when you need your first one).
Your next match can use your remaining confirmation — no second payment.
A confirmation is only used when you both confirm and we proceed with setup.
```

This keeps StrathSpace intentional, serious, and focused on real-world dating outcomes.

The payment is not for digital access.

It is a commitment pack for real-world date coordination.

---

## 35. Key Rule for the Developer

Do not allow an unconfirmed or expired match to block users.

If someone refuses to confirm or ignores the confirmation step:

```txt
Cancel the match.
Release the other person.
Restore any reserved (unspent) confirmations.
Let serious users continue matching.
```

If one person confirmed and the other did not:

```txt
Cancel the match.
Restore the confirming user's confirmation (do not spend it).
Keep the platform fair.
Protect serious users.
```

Never spend a confirmation unless both users confirm and date setup proceeds.
