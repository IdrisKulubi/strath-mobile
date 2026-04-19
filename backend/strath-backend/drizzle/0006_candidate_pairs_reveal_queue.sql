ALTER TABLE "candidate_pairs" ADD COLUMN IF NOT EXISTS "reveal_at" timestamp;
CREATE INDEX IF NOT EXISTS "candidate_pairs_reveal_at_idx" ON "candidate_pairs" ("status", "reveal_at");
