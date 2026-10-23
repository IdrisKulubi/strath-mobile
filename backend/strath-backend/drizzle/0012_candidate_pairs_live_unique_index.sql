DROP INDEX IF EXISTS "candidate_pairs_unique_pair_status_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "candidate_pairs_unique_pair_status_idx"
    ON "candidate_pairs" USING btree ("user_a_id", "user_b_id", "status")
    WHERE "status" IN ('active', 'queued', 'mutual');--> statement-breakpoint
