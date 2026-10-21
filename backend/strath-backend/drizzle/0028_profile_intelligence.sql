CREATE TABLE "profile_intelligence" (
    "user_id" text PRIMARY KEY NOT NULL,
    "profile_summary" text,
    "search_text" text,
    "text_embedding" vector(768),
    "visual_embedding" vector(768),
    "photo_presentation_score" integer DEFAULT 0 NOT NULL,
    "profile_completeness_score" integer DEFAULT 0 NOT NULL,
    "activity_score" integer DEFAULT 0 NOT NULL,
    "response_score" integer DEFAULT 0 NOT NULL,
    "inbound_interest_score" integer DEFAULT 0 NOT NULL,
    "mutual_conversion_score" integer DEFAULT 0 NOT NULL,
    "candidate_strength_score" integer DEFAULT 0 NOT NULL,
    "last_seen_at" timestamp,
    "last_profile_change_at" timestamp,
    "last_analyzed_at" timestamp,
    "analysis_version" text DEFAULT 'profile_intelligence_v1' NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "profile_intelligence" ADD CONSTRAINT "profile_intelligence_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "profile_intelligence_candidate_strength_idx"
    ON "profile_intelligence" USING btree ("candidate_strength_score");
CREATE INDEX "profile_intelligence_activity_idx"
    ON "profile_intelligence" USING btree ("activity_score");
CREATE INDEX "profile_intelligence_last_analyzed_idx"
    ON "profile_intelligence" USING btree ("last_analyzed_at");
CREATE INDEX "profile_intelligence_last_seen_idx"
    ON "profile_intelligence" USING btree ("last_seen_at");

CREATE TABLE "profile_intelligence_jobs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text,
    "job_type" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "max_attempts" integer DEFAULT 3 NOT NULL,
    "last_error" text,
    "locked_at" timestamp,
    "completed_at" timestamp,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "profile_intelligence_jobs" ADD CONSTRAINT "profile_intelligence_jobs_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "profile_intelligence_jobs_user_idx"
    ON "profile_intelligence_jobs" USING btree ("user_id");
CREATE INDEX "profile_intelligence_jobs_status_idx"
    ON "profile_intelligence_jobs" USING btree ("status");
CREATE INDEX "profile_intelligence_jobs_type_idx"
    ON "profile_intelligence_jobs" USING btree ("job_type");
CREATE INDEX "profile_intelligence_jobs_status_created_idx"
    ON "profile_intelligence_jobs" USING btree ("status", "created_at");

CREATE TABLE "matchmaker_intents" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "raw_text" text NOT NULL,
    "parsed_intent" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "intent_embedding" vector(768),
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "matchmaker_intents" ADD CONSTRAINT "matchmaker_intents_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "matchmaker_intents_user_idx"
    ON "matchmaker_intents" USING btree ("user_id");
CREATE INDEX "matchmaker_intents_created_at_idx"
    ON "matchmaker_intents" USING btree ("created_at");
