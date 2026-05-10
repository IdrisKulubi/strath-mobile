CREATE TABLE IF NOT EXISTS "user_match_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "preference_mode" text DEFAULT 'surprise_me' NOT NULL,
    "available_now" boolean DEFAULT false NOT NULL,
    "available_today" boolean DEFAULT false NOT NULL,
    "open_to_calls" boolean DEFAULT false NOT NULL,
    "preferred_age_min" integer,
    "preferred_age_max" integer,
    "preferred_universities" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "preferred_contact_window" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_match_preferences_user_unique_idx"
    ON "user_match_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "user_match_preferences_mode_idx"
    ON "user_match_preferences" ("preference_mode");
CREATE INDEX IF NOT EXISTS "user_match_preferences_availability_idx"
    ON "user_match_preferences" ("available_now", "available_today");

CREATE TABLE IF NOT EXISTS "user_match_signals" (
    "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE cascade,
    "last_active_at" timestamp,
    "active_score" integer DEFAULT 0 NOT NULL,
    "profile_views_count" integer DEFAULT 0 NOT NULL,
    "likes_given_count" integer DEFAULT 0 NOT NULL,
    "passes_given_count" integer DEFAULT 0 NOT NULL,
    "matches_received_count" integer DEFAULT 0 NOT NULL,
    "response_rate" integer DEFAULT 0 NOT NULL,
    "average_response_time_minutes" integer,
    "mutual_match_rate" integer DEFAULT 0 NOT NULL,
    "no_response_count" integer DEFAULT 0 NOT NULL,
    "open_to_meet_count" integer DEFAULT 0 NOT NULL,
    "pass_count" integer DEFAULT 0 NOT NULL,
    "maybe_count" integer DEFAULT 0 NOT NULL,
    "call_acceptance_rate" integer DEFAULT 0 NOT NULL,
    "match_quality_score" integer DEFAULT 0 NOT NULL,
    "ghosting_penalty" integer DEFAULT 0 NOT NULL,
    "pass_risk_penalty" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_match_signals_active_score_idx"
    ON "user_match_signals" ("active_score");
CREATE INDEX IF NOT EXISTS "user_match_signals_response_rate_idx"
    ON "user_match_signals" ("response_rate");
CREATE INDEX IF NOT EXISTS "user_match_signals_updated_at_idx"
    ON "user_match_signals" ("updated_at");

CREATE TABLE IF NOT EXISTS "recommendation_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "viewer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "candidate_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "source" text NOT NULL,
    "match_type" text,
    "final_score" integer,
    "compatibility_score" integer,
    "activity_score" integer,
    "response_score" integer,
    "diversity_score" integer,
    "mutual_probability_score" integer,
    "shown_at" timestamp DEFAULT now() NOT NULL,
    "viewed_at" timestamp,
    "decision" text,
    "decided_at" timestamp,
    "created_candidate_pair_id" uuid REFERENCES "candidate_pairs"("id") ON DELETE set null,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS "recommendation_events_viewer_idx"
    ON "recommendation_events" ("viewer_user_id");
CREATE INDEX IF NOT EXISTS "recommendation_events_candidate_idx"
    ON "recommendation_events" ("candidate_user_id");
CREATE INDEX IF NOT EXISTS "recommendation_events_source_idx"
    ON "recommendation_events" ("source");
CREATE INDEX IF NOT EXISTS "recommendation_events_shown_at_idx"
    ON "recommendation_events" ("shown_at");
CREATE INDEX IF NOT EXISTS "recommendation_events_viewer_candidate_idx"
    ON "recommendation_events" ("viewer_user_id", "candidate_user_id");
