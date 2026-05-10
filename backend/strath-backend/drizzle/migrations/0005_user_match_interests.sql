CREATE TABLE IF NOT EXISTS "user_match_interests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "viewer_user_id" text NOT NULL,
    "candidate_user_id" text NOT NULL,
    "decision" text NOT NULL,
    "source" text NOT NULL,
    "match_type" text,
    "last_recommendation_event_id" uuid,
    "matched_candidate_pair_id" uuid,
    "decided_at" timestamp DEFAULT now() NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "user_match_interests"
        ADD CONSTRAINT "user_match_interests_viewer_user_id_user_id_fk"
        FOREIGN KEY ("viewer_user_id") REFERENCES "public"."user"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_match_interests"
        ADD CONSTRAINT "user_match_interests_candidate_user_id_user_id_fk"
        FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id")
        ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_match_interests"
        ADD CONSTRAINT "user_match_interests_last_recommendation_event_id_recommendation_events_id_fk"
        FOREIGN KEY ("last_recommendation_event_id") REFERENCES "public"."recommendation_events"("id")
        ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_match_interests"
        ADD CONSTRAINT "user_match_interests_matched_candidate_pair_id_candidate_pairs_id_fk"
        FOREIGN KEY ("matched_candidate_pair_id") REFERENCES "public"."candidate_pairs"("id")
        ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "user_match_interests_viewer_candidate_unique_idx"
    ON "user_match_interests" USING btree ("viewer_user_id", "candidate_user_id");
CREATE INDEX IF NOT EXISTS "user_match_interests_viewer_idx"
    ON "user_match_interests" USING btree ("viewer_user_id");
CREATE INDEX IF NOT EXISTS "user_match_interests_candidate_idx"
    ON "user_match_interests" USING btree ("candidate_user_id");
CREATE INDEX IF NOT EXISTS "user_match_interests_decision_idx"
    ON "user_match_interests" USING btree ("decision");
CREATE INDEX IF NOT EXISTS "user_match_interests_reverse_lookup_idx"
    ON "user_match_interests" USING btree ("candidate_user_id", "viewer_user_id", "decision");
CREATE INDEX IF NOT EXISTS "user_match_interests_matched_pair_idx"
    ON "user_match_interests" USING btree ("matched_candidate_pair_id");

INSERT INTO "user_match_interests" (
    "viewer_user_id",
    "candidate_user_id",
    "decision",
    "source",
    "match_type",
    "last_recommendation_event_id",
    "matched_candidate_pair_id",
    "decided_at",
    "created_at",
    "updated_at"
)
SELECT DISTINCT ON ("viewer_user_id", "candidate_user_id")
    "viewer_user_id",
    "candidate_user_id",
    "decision",
    "source",
    "match_type",
    "id",
    "created_candidate_pair_id",
    COALESCE("decided_at", "shown_at"),
    COALESCE("decided_at", "shown_at"),
    now()
FROM "recommendation_events"
WHERE "decision" IN ('open_to_meet', 'maybe', 'passed')
ORDER BY "viewer_user_id", "candidate_user_id", COALESCE("decided_at", "shown_at") DESC
ON CONFLICT ("viewer_user_id", "candidate_user_id") DO UPDATE SET
    "decision" = EXCLUDED."decision",
    "source" = EXCLUDED."source",
    "match_type" = EXCLUDED."match_type",
    "last_recommendation_event_id" = EXCLUDED."last_recommendation_event_id",
    "matched_candidate_pair_id" = EXCLUDED."matched_candidate_pair_id",
    "decided_at" = EXCLUDED."decided_at",
    "updated_at" = now();

INSERT INTO "user_match_interests" (
    "viewer_user_id",
    "candidate_user_id",
    "decision",
    "source",
    "matched_candidate_pair_id",
    "decided_at",
    "created_at",
    "updated_at"
)
SELECT
    "user_a_id",
    "user_b_id",
    "open_to_meet",
    "daily_recommendations",
    "id",
    COALESCE("updated_at", "created_at"),
    COALESCE("created_at", now()),
    now()
FROM "candidate_pairs"
WHERE "a_decision" = 'open_to_meet'
  AND "b_decision" = 'pending'
  AND "status" = 'active'
ON CONFLICT ("viewer_user_id", "candidate_user_id") DO NOTHING;

INSERT INTO "user_match_interests" (
    "viewer_user_id",
    "candidate_user_id",
    "decision",
    "source",
    "matched_candidate_pair_id",
    "decided_at",
    "created_at",
    "updated_at"
)
SELECT
    "user_b_id",
    "user_a_id",
    "open_to_meet",
    "daily_recommendations",
    "id",
    COALESCE("updated_at", "created_at"),
    COALESCE("created_at", now()),
    now()
FROM "candidate_pairs"
WHERE "b_decision" = 'open_to_meet'
  AND "a_decision" = 'pending'
  AND "status" = 'active'
ON CONFLICT ("viewer_user_id", "candidate_user_id") DO NOTHING;
