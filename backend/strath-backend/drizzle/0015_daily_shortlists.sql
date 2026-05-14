CREATE TABLE "daily_shortlists" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "viewer_user_id" text NOT NULL,
    "candidate_user_id" text NOT NULL,
    "shortlist_day" text NOT NULL,
    "position" integer NOT NULL,
    "match_type" text,
    "final_score" integer,
    "compatibility_score" integer,
    "activity_score" integer,
    "response_score" integer,
    "diversity_score" integer,
    "mutual_probability_score" integer,
    "recommendation_event_id" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "daily_shortlists" ADD CONSTRAINT "daily_shortlists_viewer_user_id_user_id_fk"
    FOREIGN KEY ("viewer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_shortlists" ADD CONSTRAINT "daily_shortlists_candidate_user_id_user_id_fk"
    FOREIGN KEY ("candidate_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_shortlists" ADD CONSTRAINT "daily_shortlists_recommendation_event_id_recommendation_events_id_fk"
    FOREIGN KEY ("recommendation_event_id") REFERENCES "public"."recommendation_events"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "daily_shortlists_viewer_day_position_unique_idx"
    ON "daily_shortlists" USING btree ("viewer_user_id", "shortlist_day", "position");
CREATE UNIQUE INDEX "daily_shortlists_viewer_day_candidate_unique_idx"
    ON "daily_shortlists" USING btree ("viewer_user_id", "shortlist_day", "candidate_user_id");
CREATE INDEX "daily_shortlists_viewer_day_idx"
    ON "daily_shortlists" USING btree ("viewer_user_id", "shortlist_day");
CREATE INDEX "daily_shortlists_candidate_idx"
    ON "daily_shortlists" USING btree ("candidate_user_id");

WITH first_daily_events AS (
    SELECT
        "id",
        "viewer_user_id",
        "candidate_user_id",
        ("shown_at" AT TIME ZONE 'UTC')::date::text AS "shortlist_day",
        "match_type",
        "final_score",
        "compatibility_score",
        "activity_score",
        "response_score",
        "diversity_score",
        "mutual_probability_score",
        "metadata",
        "shown_at",
        row_number() OVER (
            PARTITION BY "viewer_user_id", ("shown_at" AT TIME ZONE 'UTC')::date, "candidate_user_id"
            ORDER BY "shown_at" ASC
        ) AS "candidate_rank"
    FROM "recommendation_events"
    WHERE "source" = 'daily_recommendations'
      AND "decision" = 'shown'
),
daily_positions AS (
    SELECT
        *,
        row_number() OVER (
            PARTITION BY "viewer_user_id", "shortlist_day"
            ORDER BY "shown_at" ASC
        ) AS "position"
    FROM first_daily_events
    WHERE "candidate_rank" = 1
)
INSERT INTO "daily_shortlists" (
    "viewer_user_id",
    "candidate_user_id",
    "shortlist_day",
    "position",
    "match_type",
    "final_score",
    "compatibility_score",
    "activity_score",
    "response_score",
    "diversity_score",
    "mutual_probability_score",
    "recommendation_event_id",
    "metadata",
    "created_at",
    "updated_at"
)
SELECT
    "viewer_user_id",
    "candidate_user_id",
    "shortlist_day",
    ("position" - 1)::int,
    "match_type",
    "final_score",
    "compatibility_score",
    "activity_score",
    "response_score",
    "diversity_score",
    "mutual_probability_score",
    "id",
    COALESCE("metadata", '{}'::jsonb),
    "shown_at",
    now()
FROM daily_positions
WHERE "position" <= 5
ON CONFLICT DO NOTHING;
