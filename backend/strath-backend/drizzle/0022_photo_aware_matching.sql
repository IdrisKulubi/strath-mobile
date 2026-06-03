CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "profile_photo_analysis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "profile_id" uuid REFERENCES "profiles"("id") ON DELETE CASCADE,
  "photo_url" text NOT NULL,
  "photo_hash" text,
  "quality_score" integer DEFAULT 0 NOT NULL,
  "face_visible" boolean DEFAULT false NOT NULL,
  "image_clear" boolean DEFAULT false NOT NULL,
  "lighting_score" integer DEFAULT 0 NOT NULL,
  "blur_score" integer DEFAULT 0 NOT NULL,
  "duplicate_score" integer DEFAULT 0 NOT NULL,
  "has_multiple_people" boolean DEFAULT false NOT NULL,
  "is_screenshot_or_meme" boolean DEFAULT false NOT NULL,
  "is_object_or_landscape_only" boolean DEFAULT false NOT NULL,
  "moderation_status" text DEFAULT 'pending' NOT NULL,
  "moderation_reason" text,
  "embedding_provider" text,
  "embedding_model" text,
  "embedding_id" uuid,
  "analysis_version" text DEFAULT 'v1' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "profile_photo_analysis_user_idx" ON "profile_photo_analysis" ("user_id");
CREATE INDEX IF NOT EXISTS "profile_photo_analysis_profile_idx" ON "profile_photo_analysis" ("profile_id");
CREATE INDEX IF NOT EXISTS "profile_photo_analysis_photo_url_idx" ON "profile_photo_analysis" ("photo_url");
CREATE INDEX IF NOT EXISTS "profile_photo_analysis_moderation_idx" ON "profile_photo_analysis" ("moderation_status");
CREATE INDEX IF NOT EXISTS "profile_photo_analysis_quality_idx" ON "profile_photo_analysis" ("quality_score");
CREATE UNIQUE INDEX IF NOT EXISTS "profile_photo_analysis_user_photo_url_idx" ON "profile_photo_analysis" ("user_id", "photo_url");

CREATE TABLE IF NOT EXISTS "profile_photo_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "photo_analysis_id" uuid REFERENCES "profile_photo_analysis"("id") ON DELETE CASCADE,
  "embedding" vector(768),
  "provider" text NOT NULL,
  "model" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "profile_photo_embeddings_user_idx" ON "profile_photo_embeddings" ("user_id");
CREATE INDEX IF NOT EXISTS "profile_photo_embeddings_analysis_idx" ON "profile_photo_embeddings" ("photo_analysis_id");

CREATE TABLE IF NOT EXISTS "user_visual_preference_signals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "liked_embedding_centroid" jsonb,
  "passed_embedding_centroid" jsonb,
  "total_visual_likes" integer DEFAULT 0 NOT NULL,
  "total_visual_passes" integer DEFAULT 0 NOT NULL,
  "total_visual_views" integer DEFAULT 0 NOT NULL,
  "preference_confidence" integer DEFAULT 0 NOT NULL,
  "last_updated_from_event_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_visual_preference_signals_user_unique_idx" ON "user_visual_preference_signals" ("user_id");

CREATE TABLE IF NOT EXISTS "profile_interaction_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "target_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "source" text,
  "time_spent_ms" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "profile_interaction_events_actor_idx" ON "profile_interaction_events" ("actor_user_id");
CREATE INDEX IF NOT EXISTS "profile_interaction_events_target_idx" ON "profile_interaction_events" ("target_user_id");
CREATE INDEX IF NOT EXISTS "profile_interaction_events_type_idx" ON "profile_interaction_events" ("event_type");
CREATE INDEX IF NOT EXISTS "profile_interaction_events_created_at_idx" ON "profile_interaction_events" ("created_at");

ALTER TABLE "user_match_signals" ADD COLUMN IF NOT EXISTS "photo_quality_score" integer DEFAULT 0 NOT NULL;
ALTER TABLE "user_match_signals" ADD COLUMN IF NOT EXISTS "visual_preference_confidence" integer DEFAULT 0 NOT NULL;
ALTER TABLE "user_match_signals" ADD COLUMN IF NOT EXISTS "has_usable_profile_photo" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_match_signals" ADD COLUMN IF NOT EXISTS "photo_analysis_completed" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_match_signals" ADD COLUMN IF NOT EXISTS "photo_analysis_updated_at" timestamp;
