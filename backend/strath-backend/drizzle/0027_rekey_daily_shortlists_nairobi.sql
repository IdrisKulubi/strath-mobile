-- Daily discovery is a Nairobi-day product surface. Rebuild the cache from
-- shown recommendation events so any UTC-keyed rows from the first rollout are
-- aligned with the key used by the recommendation service.
DELETE FROM "daily_shortlists";

WITH first_daily_events AS (
    SELECT
        "id",
        "viewer_user_id",
        "candidate_user_id",
        ("shown_at" AT TIME ZONE 'Africa/Nairobi')::date::text AS "shortlist_day",
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
            PARTITION BY "viewer_user_id", ("shown_at" AT TIME ZONE 'Africa/Nairobi')::date, "candidate_user_id"
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
