ALTER TABLE "candidate_pairs" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;
ALTER TABLE "candidate_pairs" ADD COLUMN IF NOT EXISTS "one_sided_reminder_sent_at" timestamp;

CREATE INDEX IF NOT EXISTS "candidate_pairs_reminder_idx"
    ON "candidate_pairs" ("status", "expires_at", "reminder_sent_at");

CREATE INDEX IF NOT EXISTS "candidate_pairs_one_sided_reminder_idx"
    ON "candidate_pairs" ("status", "one_sided_reminder_sent_at");
