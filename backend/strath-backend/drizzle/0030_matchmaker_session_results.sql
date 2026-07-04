CREATE TABLE IF NOT EXISTS "matchmaker_session_results" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "matchmaker_sessions"("id") ON DELETE cascade,
    "viewer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "candidate_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "position" integer NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "reason" text,
    "labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "intent_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_session_results_session_idx"
    ON "matchmaker_session_results" ("session_id");

CREATE INDEX IF NOT EXISTS "matchmaker_session_results_viewer_idx"
    ON "matchmaker_session_results" ("viewer_user_id");

CREATE INDEX IF NOT EXISTS "matchmaker_session_results_candidate_idx"
    ON "matchmaker_session_results" ("candidate_user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "matchmaker_session_results_session_candidate_unique_idx"
    ON "matchmaker_session_results" ("session_id", "candidate_user_id");
