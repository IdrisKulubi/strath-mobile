-- Signup cap + waitlist + admin broadcasts
-- 1) Extend app_feature_flags to carry per-flag config as jsonb
ALTER TABLE "app_feature_flags"
    ADD COLUMN IF NOT EXISTS "config" jsonb DEFAULT '{}'::jsonb NOT NULL;

-- 2) Add waitlist state to profiles
ALTER TABLE "profiles"
    ADD COLUMN IF NOT EXISTS "waitlist_status" text,
    ADD COLUMN IF NOT EXISTS "waitlist_position" integer,
    ADD COLUMN IF NOT EXISTS "admitted_at" timestamp;

CREATE INDEX IF NOT EXISTS "profile_waitlist_status_idx"
    ON "profiles" USING btree ("waitlist_status");

CREATE INDEX IF NOT EXISTS "profile_waitlist_status_gender_idx"
    ON "profiles" USING btree ("waitlist_status", "gender");

CREATE INDEX IF NOT EXISTS "profile_waitlist_position_idx"
    ON "profiles" USING btree ("waitlist_status", "gender", "waitlist_position");

-- 3) Grandfather existing completed profiles in as "admitted" so we don't
--    retroactively waitlist anyone who already finished onboarding.
UPDATE "profiles"
SET "waitlist_status" = 'admitted',
    "admitted_at" = COALESCE("admitted_at", "updated_at", now())
WHERE ("profile_completed" = true OR "is_complete" = true)
  AND "waitlist_status" IS NULL;

-- 4) Register the new signup-cap flag (disabled by default, configurable caps).
INSERT INTO "app_feature_flags" ("key", "enabled", "description", "config")
VALUES (
    'signup_cap_enabled',
    false,
    'Gate new signups behind per-gender capacity limits during soft launch. When enabled, users who complete onboarding past the cap are placed on a waitlist.',
    '{"maxMale": 100, "maxFemale": 100, "maxOther": 20}'::jsonb
)
ON CONFLICT ("key") DO NOTHING;

-- 5) Admin broadcast history (push announcements sent from the admin console).
CREATE TABLE IF NOT EXISTS "admin_broadcasts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" text NOT NULL,
    "body" text NOT NULL,
    "audience" text NOT NULL,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "success_count" integer DEFAULT 0 NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "sent_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
    "sent_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_broadcasts_sent_at_idx"
    ON "admin_broadcasts" USING btree ("sent_at");

CREATE INDEX IF NOT EXISTS "admin_broadcasts_sent_by_idx"
    ON "admin_broadcasts" USING btree ("sent_by_user_id");
