ALTER TABLE "matchmaker_preference_changes"
ADD COLUMN IF NOT EXISTS "request_key" text;

CREATE UNIQUE INDEX IF NOT EXISTS "matchmaker_preference_changes_user_request_key_unique"
ON "matchmaker_preference_changes" ("user_id", "request_key");
