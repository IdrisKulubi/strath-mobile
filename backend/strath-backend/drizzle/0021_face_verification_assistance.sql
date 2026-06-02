CREATE TABLE IF NOT EXISTS "face_verification_assistance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"email" text NOT NULL,
	"phone_number" text,
	"message" text NOT NULL,
	"failure_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verification_status" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "face_verification_assistance" ADD CONSTRAINT "face_verification_assistance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "face_verification_assistance" ADD CONSTRAINT "face_verification_assistance_session_id_face_verification_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."face_verification_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "face_verification_assistance_session_idx" ON "face_verification_assistance" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "face_verification_assistance_user_idx" ON "face_verification_assistance" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "face_verification_assistance_status_idx" ON "face_verification_assistance" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "face_verification_assistance_created_at_idx" ON "face_verification_assistance" USING btree ("created_at");
