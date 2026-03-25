CREATE TABLE "profile_photo_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"public_url" text NOT NULL,
	"content_type" text,
	"normalized_format" text,
	"file_size_bytes" integer,
	"width" integer,
	"height" integer,
	"face_count" integer DEFAULT 0 NOT NULL,
	"quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_format_supported" boolean DEFAULT false NOT NULL,
	"verification_ready" boolean DEFAULT false NOT NULL,
	"analysis_version" text,
	"analysis_error" text,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "face_verification_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" text,
	"session_id" uuid,
	"asset_key" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"lease_expires_at" timestamp,
	"claimed_by" text,
	"last_error" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_photo_assets" ADD CONSTRAINT "profile_photo_assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_verification_jobs" ADD CONSTRAINT "face_verification_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_verification_jobs" ADD CONSTRAINT "face_verification_jobs_session_id_face_verification_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."face_verification_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "face_verification_sessions_queue_idx" ON "face_verification_sessions" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "profile_photo_assets_user_idx" ON "profile_photo_assets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_photo_assets_object_key_idx" ON "profile_photo_assets" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "profile_photo_assets_ready_idx" ON "profile_photo_assets" USING btree ("verification_ready","last_analyzed_at");--> statement-breakpoint
CREATE INDEX "face_verification_jobs_status_available_idx" ON "face_verification_jobs" USING btree ("status","available_at","priority","created_at");--> statement-breakpoint
CREATE INDEX "face_verification_jobs_session_idx" ON "face_verification_jobs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "face_verification_jobs_asset_idx" ON "face_verification_jobs" USING btree ("asset_key");--> statement-breakpoint
CREATE INDEX "face_verification_jobs_worker_idx" ON "face_verification_jobs" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "face_verification_jobs_active_session_job_idx" ON "face_verification_jobs" USING btree ("job_type","session_id") WHERE "session_id" IS NOT NULL AND "status" IN ('pending','processing');--> statement-breakpoint
CREATE UNIQUE INDEX "face_verification_jobs_active_asset_job_idx" ON "face_verification_jobs" USING btree ("job_type","asset_key") WHERE "asset_key" IS NOT NULL AND "status" IN ('pending','processing');
