# Phase 8 — Payment-expiry cron + credit logic

**Status:** ⬜ Not started
**Depends on:** Phases 1, 5, 7
**User-visible:** Indirect (prevents stuck users; grants credit)

## Goal

Make sure nobody is ever stuck waiting on a non-payer. When the payment window
(`payment_due_by`) passes without both people paying, expire the match, release
both users back to matching, and **auto-convert the paying user's KES 499 to
StrathSpace credit** (with a refund option later, phase 9). Flag the non-payer as
low intent.

## Files

- `src/app/api/cron/payment-expiry/route.ts` — new cron (mirrors existing crons:
  `GET`, `isAuthorizedCronRequest`, `force-dynamic`).
- Logic can live in `payment-service.ts` → `expirePaymentMatch(dateMatchId)`.
- `vercel.json` — add the cron schedule (every 15 min).

## Cron logic

```sql
-- candidate matches
SELECT * FROM date_matches
WHERE payment_state IN ('awaiting_payment','paid_waiting_for_other')
  AND payment_due_by < now();
```

For each expired match:

1. Set `date_matches.payment_state = 'expired'`, `status = 'cancelled'`.
2. Set linked `mutual_matches.status = 'expired'` (reuse
   `expireUnconfirmedMeetups` / `syncMutualMatchFromDateMatch` so the existing
   release-to-matching behavior runs).
3. Branch on who paid:
   - **Nobody paid** → just cancel + release. No money involved.
   - **One paid** (the `paid_waiting_for_other` case):
     - Grant credit: insert `user_credits` row `{ userId: payer, amountCents:
       +49900, reason: 'partner_did_not_pay', dateMatchId, paymentId, status:
       'active' }`.
     - Mark that `date_payments` row `status = 'credited'`, `creditedAt = now`.
     - Increment the **non-payer's** `low_intent_score`.
     - Queue a notification to the payer (phase 11): "They didn't confirm in
       time — you've got KES 499 credit (or request a refund)."
4. Idempotency: only act on matches still in a pre-expiry state; re-running the
   cron must not grant credit twice. Guard by checking the payment row is not
   already `credited`/`refunded`.

## Steps

1. Add `expirePaymentMatch` to `payment-service.ts` with the branch logic + an
   idempotency guard.
2. Create the cron route; loop candidate matches, call the helper, log counts.
3. Add to `vercel.json`:
   ```json
   { "path": "/api/cron/payment-expiry", "schedule": "*/15 * * * *" }
   ```

## How to test

1. **One-paid expiry:**
   - Seed a match in `paid_waiting_for_other` (pay as A only via phases 3–5).
   - Force expiry: `UPDATE date_matches SET payment_due_by = now() - interval '1 hour' WHERE id='<id>';`
   - Run the cron:
     ```bash
     curl "http://localhost:3000/api/cron/payment-expiry" -H "Authorization: Bearer $CRON_SECRET"
     ```
   - Assert:
     ```sql
     SELECT payment_state, status FROM date_matches WHERE id='<id>';        -- expired, cancelled
     SELECT status FROM mutual_matches WHERE legacy_date_match_id='<id>';     -- expired
     SELECT amount_cents, reason FROM user_credits WHERE user_id='<payerA>'; -- 49900, partner_did_not_pay
     SELECT status FROM date_payments WHERE date_match_id='<id>' AND user_id='<payerA>'; -- credited
     SELECT low_intent_score FROM <user/profile table> WHERE id='<userB>';   -- incremented
     ```

2. **Idempotency:** run the cron 3× → exactly **one** credit row for the payer,
   `low_intent_score` incremented exactly once.

3. **Nobody-paid expiry:** seed `awaiting_payment`, force expiry, run cron →
   match cancelled, **no** credit rows created.

4. **Both-paid is untouched:** a `both_paid` match past its (now irrelevant)
   window is **not** expired/cancelled by this cron.

5. **Release to matching:** after expiry, confirm both users can receive new
   daily intros (the match hold is cleared) — check `GET /api/home/daily-matches`
   no longer returns a hold for them.

## Done when

- [ ] Expired one-paid matches grant exactly one KES 499 credit to the payer.
- [ ] Non-payer's `low_intent_score` increments once.
- [ ] Nobody-paid matches cancel with no credit.
- [ ] Cron is idempotent and authorized via `CRON_SECRET`.
- [ ] Both users are released back to matching.

## Rollback

Remove the cron schedule from `vercel.json` and delete the route. Existing
credits already granted remain valid (they're real money owed).
