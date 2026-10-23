CREATE TABLE "matchmaker_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL,
    "session_day" text NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "state" text DEFAULT 'greeting' NOT NULL,
    "daily_search_count" integer DEFAULT 0 NOT NULL,
    "search_limit" integer DEFAULT 3 NOT NULL,
    "current_intent" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "current_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "last_candidate_user_id" text,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "matchmaker_sessions" ADD CONSTRAINT "matchmaker_sessions_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "matchmaker_sessions" ADD CONSTRAINT "matchmaker_sessions_last_candidate_user_id_user_id_fk"
    FOREIGN KEY ("last_candidate_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "matchmaker_sessions_user_day_idx"
    ON "matchmaker_sessions" USING btree ("user_id", "session_day");
CREATE INDEX "matchmaker_sessions_status_idx"
    ON "matchmaker_sessions" USING btree ("status");
CREATE INDEX "matchmaker_sessions_updated_at_idx"
    ON "matchmaker_sessions" USING btree ("updated_at");

CREATE TABLE "matchmaker_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL,
    "role" text NOT NULL,
    "kind" text DEFAULT 'text' NOT NULL,
    "text" text NOT NULL,
    "quick_replies" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "matchmaker_messages" ADD CONSTRAINT "matchmaker_messages_session_id_matchmaker_sessions_id_fk"
    FOREIGN KEY ("session_id") REFERENCES "public"."matchmaker_sessions"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "matchmaker_messages_session_created_idx"
    ON "matchmaker_messages" USING btree ("session_id", "created_at");
CREATE INDEX "matchmaker_messages_role_idx"
    ON "matchmaker_messages" USING btree ("role");
