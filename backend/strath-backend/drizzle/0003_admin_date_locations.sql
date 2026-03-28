CREATE TABLE "date_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"vibe" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_matches" ADD COLUMN "location_id" uuid;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_location_id_date_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."date_locations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "date_locations_name_idx" ON "date_locations" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "date_locations_vibe_idx" ON "date_locations" USING btree ("vibe");
--> statement-breakpoint
CREATE INDEX "date_locations_active_idx" ON "date_locations" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX "date_match_location_idx" ON "date_matches" USING btree ("location_id");
