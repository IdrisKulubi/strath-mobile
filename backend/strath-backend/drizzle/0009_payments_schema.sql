-- docs/payment.md §4 — Data model changes for the pay-per-date model.
--
-- 1. Extend date_matches with an orthogonal payment state machine.
-- 2. Add date_payments (one row per user per match).
-- 3. Add user_credits ledger for refunds-as-credit.
--
-- This migration is safe to run while `payments_enabled = false` — the new
-- column defaults to 'not_required', and no existing code path touches the
-- new tables until the feature flag flips on.

-- ─── 1. date_matches ─────────────────────────────────────────────────────────

ALTER TABLE "date_matches"
ADD COLUMN IF NOT EXISTS "payment_state" text NOT NULL DEFAULT 'not_required';

ALTER TABLE "date_matches"
ADD COLUMN IF NOT EXISTS "payment_due_by" timestamp;

CREATE INDEX IF NOT EXISTS "date_match_payment_state_idx"
ON "date_matches" ("payment_state");

-- ─── 2. date_payments ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "date_payments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "date_match_id" uuid NOT NULL REFERENCES "date_matches" ("id") ON DELETE CASCADE,
    "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,

    "amount_cents" integer NOT NULL,
    "currency" text NOT NULL DEFAULT 'KES',

    "provider" text NOT NULL,
    "platform" text,
    "revenuecat_app_user_id" text,
    "revenuecat_transaction_id" text,
    "store_transaction_id" text,
    "product_id" text NOT NULL,

    "status" text NOT NULL DEFAULT 'pending',
    "paid_at" timestamp,
    "refunded_at" timestamp,
    "refund_reason" text,

    "raw_webhook_payload" jsonb,
    -- "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "date_payments_user_match_unique"
ON "date_payments" ("date_match_id", "user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "date_payments_transaction_unique"
ON "date_payments" ("revenuecat_transaction_id");

CREATE INDEX IF NOT EXISTS "date_payments_user_idx"
ON "date_payments" ("user_id");

CREATE INDEX IF NOT EXISTS "date_payments_status_idx"
ON "date_payments" ("status");

-- ─── 3. user_credits ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user_credits" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "amount_cents" integer NOT NULL,
    "currency" text NOT NULL DEFAULT 'KES',
    "reason" text NOT NULL,
    "date_match_id" uuid REFERENCES "date_matches" ("id") ON DELETE SET NULL,
    "admin_user_id" text REFERENCES "user" ("id") ON DELETE SET NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_credits_user_idx"
ON "user_credits" ("user_id");

CREATE INDEX IF NOT EXISTS "user_credits_date_match_idx"
ON "user_credits" ("date_match_id");
