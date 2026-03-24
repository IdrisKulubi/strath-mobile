CREATE TABLE "face_verification_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"source_asset_key" text NOT NULL,
	"target_asset_key" text NOT NULL,
	"similarity" integer,
	"face_confidence" integer,
	"quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faces_detected" integer DEFAULT 0 NOT NULL,
	"decision" text NOT NULL,
	"raw_provider_response_redacted" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "face_verification_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending_capture' NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"selfie_asset_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"profile_asset_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"threshold_config_version" text DEFAULT 'comparefaces_v1' NOT NULL,
	"decision_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"failure_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verification_status" text DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verification_method" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verification_version" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verification_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "face_verification_retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "face_verification_results" ADD CONSTRAINT "face_verification_results_session_id_face_verification_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."face_verification_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_verification_sessions" ADD CONSTRAINT "face_verification_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "face_verification_results_session_idx" ON "face_verification_results" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "face_verification_results_decision_idx" ON "face_verification_results" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "face_verification_sessions_user_idx" ON "face_verification_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "face_verification_sessions_status_idx" ON "face_verification_sessions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "face_verification_sessions_user_attempt_idx" ON "face_verification_sessions" USING btree ("user_id","attempt_number");--> statement-breakpoint
CREATE INDEX "profile_face_verification_status_idx" ON "profiles" USING btree ("face_verification_status");