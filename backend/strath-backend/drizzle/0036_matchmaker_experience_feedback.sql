ALTER TABLE "feedbacks"
ADD COLUMN IF NOT EXISTS "email" text;

ALTER TABLE "feedbacks"
ADD COLUMN IF NOT EXISTS "rating" integer;

ALTER TABLE "feedbacks"
ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'app' NOT NULL;

DO $$
BEGIN
    ALTER TABLE "feedbacks"
    ADD CONSTRAINT "feedbacks_rating_check"
    CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "feedbacks_source_idx"
ON "feedbacks" ("source");

CREATE UNIQUE INDEX IF NOT EXISTS "feedbacks_matchmaker_v2_user_unique"
ON "feedbacks" ("user_id")
WHERE "source" = 'matchmaker_v2' AND "user_id" IS NOT NULL;
