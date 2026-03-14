CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "analytics_event_type_idx" ON "analytics_events" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX "analytics_event_user_idx" ON "analytics_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "analytics_event_created_at_idx" ON "analytics_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "analytics_event_type_created_idx" ON "analytics_events" USING btree ("event_type","created_at");
