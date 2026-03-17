CREATE TABLE "candidate_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"compatibility_score" integer NOT NULL,
	"match_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shown_to_a_at" timestamp DEFAULT now() NOT NULL,
	"shown_to_b_at" timestamp DEFAULT now() NOT NULL,
	"a_decision" text DEFAULT 'pending' NOT NULL,
	"b_decision" text DEFAULT 'pending' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_pair_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pair_id" uuid NOT NULL,
	"actor_user_id" text,
	"from_status" text,
	"to_status" text,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mutual_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_pair_id" uuid NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"status" text DEFAULT 'mutual' NOT NULL,
	"legacy_match_id" text,
	"legacy_date_match_id" uuid,
	"venue_name" text,
	"venue_address" text,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidate_pairs" ADD CONSTRAINT "candidate_pairs_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_pairs" ADD CONSTRAINT "candidate_pairs_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_pair_history" ADD CONSTRAINT "candidate_pair_history_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "candidate_pair_history" ADD CONSTRAINT "candidate_pair_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_candidate_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("candidate_pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_legacy_match_id_matches_id_fk" FOREIGN KEY ("legacy_match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_legacy_date_match_id_date_matches_id_fk" FOREIGN KEY ("legacy_date_match_id") REFERENCES "public"."date_matches"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_matches" ALTER COLUMN "request_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD COLUMN "candidate_pair_id" uuid;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_candidate_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("candidate_pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_pairs_unique_pair_status_idx" ON "candidate_pairs" USING btree ("user_a_id","user_b_id","status");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_user_a_idx" ON "candidate_pairs" USING btree ("user_a_id");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_user_b_idx" ON "candidate_pairs" USING btree ("user_b_id");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_status_idx" ON "candidate_pairs" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_expires_idx" ON "candidate_pairs" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_active_exposure_a_idx" ON "candidate_pairs" USING btree ("user_a_id","status","expires_at");
--> statement-breakpoint
CREATE INDEX "candidate_pairs_active_exposure_b_idx" ON "candidate_pairs" USING btree ("user_b_id","status","expires_at");
--> statement-breakpoint
CREATE INDEX "candidate_pair_history_pair_idx" ON "candidate_pair_history" USING btree ("pair_id");
--> statement-breakpoint
CREATE INDEX "candidate_pair_history_actor_idx" ON "candidate_pair_history" USING btree ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "candidate_pair_history_event_idx" ON "candidate_pair_history" USING btree ("event_type");
--> statement-breakpoint
CREATE UNIQUE INDEX "mutual_matches_candidate_pair_unique_idx" ON "mutual_matches" USING btree ("candidate_pair_id");
--> statement-breakpoint
CREATE INDEX "mutual_matches_user_a_idx" ON "mutual_matches" USING btree ("user_a_id");
--> statement-breakpoint
CREATE INDEX "mutual_matches_user_b_idx" ON "mutual_matches" USING btree ("user_b_id");
--> statement-breakpoint
CREATE INDEX "mutual_matches_status_idx" ON "mutual_matches" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "mutual_matches_legacy_match_idx" ON "mutual_matches" USING btree ("legacy_match_id");
--> statement-breakpoint
CREATE INDEX "mutual_matches_legacy_date_match_idx" ON "mutual_matches" USING btree ("legacy_date_match_id");
--> statement-breakpoint
CREATE INDEX "date_match_candidate_pair_idx" ON "date_matches" USING btree ("candidate_pair_id");
