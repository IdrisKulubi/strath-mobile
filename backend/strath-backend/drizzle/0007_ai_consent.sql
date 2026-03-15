ALTER TABLE "profiles" ADD COLUMN "ai_consent_granted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "ai_consent_updated_at" timestamp;
--> statement-breakpoint
CREATE INDEX "profile_ai_consent_idx" ON "profiles" USING btree ("ai_consent_granted");
