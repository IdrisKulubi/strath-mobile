CREATE TABLE IF NOT EXISTS "matchmaker_shortlists" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "matchmaker_sessions"("id") ON DELETE cascade,
    "viewer_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "request_key" text NOT NULL,
    "brief_version" integer DEFAULT 0 NOT NULL,
    "intent_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "status" text DEFAULT 'persisted' NOT NULL,
    "credit_consumed" boolean DEFAULT false NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_shortlists_session_idx" ON "matchmaker_shortlists" ("session_id");
CREATE INDEX IF NOT EXISTS "matchmaker_shortlists_viewer_idx" ON "matchmaker_shortlists" ("viewer_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "matchmaker_shortlists_request_key_unique_idx" ON "matchmaker_shortlists" ("request_key");
CREATE INDEX IF NOT EXISTS "matchmaker_shortlists_session_created_idx" ON "matchmaker_shortlists" ("session_id", "created_at");

ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "shortlist_id" uuid REFERENCES "matchmaker_shortlists"("id") ON DELETE set null;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "fit_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "matched_preference_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "reciprocal_fit_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "tradeoff" text;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "unknown" text;
ALTER TABLE "matchmaker_session_results" ADD COLUMN IF NOT EXISTS "matching_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS "matchmaker_session_results_shortlist_idx" ON "matchmaker_session_results" ("shortlist_id");
