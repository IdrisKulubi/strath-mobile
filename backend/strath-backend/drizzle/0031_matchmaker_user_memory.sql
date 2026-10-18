CREATE TABLE IF NOT EXISTS "matchmaker_user_memory" (
    "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE cascade,
    "positive_signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "negative_signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "feedback_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "memory_summary" text,
    "last_feedback_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matchmaker_user_memory_updated_at_idx"
    ON "matchmaker_user_memory" ("updated_at");

CREATE INDEX IF NOT EXISTS "matchmaker_user_memory_last_feedback_idx"
    ON "matchmaker_user_memory" ("last_feedback_at");
