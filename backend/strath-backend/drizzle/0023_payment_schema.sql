-- Phase 1: Date Setup Fee schema + payments_enabled feature flag seed

ALTER TABLE "date_matches"
ADD COLUMN IF NOT EXISTS "payment_state" text DEFAULT 'not_required' NOT NULL,
ADD COLUMN IF NOT EXISTS "payment_due_by" timestamp,
ADD COLUMN IF NOT EXISTS "payment_amount_cents" integer DEFAULT 49900 NOT NULL,
ADD COLUMN IF NOT EXISTS "payment_currency" text DEFAULT 'KES' NOT NULL,
ADD COLUMN IF NOT EXISTS "paid_user_count" integer DEFAULT 0 NOT NULL;

-- If drizzle-kit push created date_payments without paystack_reference, drop it first.
DROP TABLE IF EXISTS "user_credits";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'date_payments'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'date_payments'
      AND column_name = 'paystack_reference'
  ) THEN
    DROP TABLE "date_payments";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "date_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date_match_id" uuid NOT NULL REFERENCES "date_matches"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "provider" text DEFAULT 'paystack' NOT NULL,
  "paystack_reference" text NOT NULL,
  "paystack_transaction_id" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "paid_at" timestamp,
  "refunded_at" timestamp,
  "credited_at" timestamp,
  "refund_reason" text,
  "raw_verify_payload" jsonb,
  "raw_webhook_payload" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "date_payments_paystack_reference_unique" UNIQUE("paystack_reference")
);

CREATE UNIQUE INDEX IF NOT EXISTS "date_payments_user_match_unique"
  ON "date_payments" ("date_match_id", "user_id");

CREATE INDEX IF NOT EXISTS "date_payments_reference_idx"
  ON "date_payments" ("paystack_reference");

CREATE INDEX IF NOT EXISTS "date_payments_status_idx"
  ON "date_payments" ("status");

CREATE TABLE IF NOT EXISTS "user_credits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "amount_cents" integer NOT NULL,
  "currency" text DEFAULT 'KES' NOT NULL,
  "reason" text NOT NULL,
  "date_match_id" uuid REFERENCES "date_matches"("id") ON DELETE SET NULL,
  "payment_id" uuid REFERENCES "date_payments"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_credits_user_idx"
  ON "user_credits" ("user_id");

ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "low_intent_score" integer DEFAULT 0 NOT NULL;

INSERT INTO "app_feature_flags" ("key", "enabled", "description", "config")
VALUES (
  'payments_enabled',
  false,
  'Require KES 499 Date Setup Fee before slot confirmation. Uses Paystack.',
  '{}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;
