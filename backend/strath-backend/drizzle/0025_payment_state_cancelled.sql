-- payment_state is text (not a PG enum). App now uses 'cancelled' when a paid date is
-- user-cancelled and payments are closed out. Document the value and fix stale rows.

COMMENT ON COLUMN "date_matches"."payment_state" IS
  'not_required | awaiting_payment | paid_waiting_for_other | both_paid | expired | cancelled';

-- Align payment_state for dates already marked cancelled before this deploy.
-- Does not create user_credits; run app cancel backfill separately if payers need credit.
UPDATE "date_matches"
SET
  "payment_state" = 'cancelled',
  "paid_user_count" = 0
WHERE "status" = 'cancelled'
  AND "payment_state" IN ('awaiting_payment', 'paid_waiting_for_other', 'both_paid');
