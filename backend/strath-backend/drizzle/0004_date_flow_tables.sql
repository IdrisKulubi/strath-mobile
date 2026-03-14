CREATE TABLE "date_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"vibe" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"vibe" text NOT NULL,
	"call_completed" boolean DEFAULT false,
	"user_a_confirmed" boolean DEFAULT false,
	"user_b_confirmed" boolean DEFAULT false,
	"status" text DEFAULT 'pending_setup' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "date_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date_match_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"meet_again" text NOT NULL,
	"text_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "date_requests" ADD CONSTRAINT "date_requests_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_requests" ADD CONSTRAINT "date_requests_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_request_id_date_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."date_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_feedback" ADD CONSTRAINT "date_feedback_date_match_id_date_matches_id_fk" FOREIGN KEY ("date_match_id") REFERENCES "public"."date_matches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "date_feedback" ADD CONSTRAINT "date_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "date_request_from_idx" ON "date_requests" USING btree ("from_user_id");
--> statement-breakpoint
CREATE INDEX "date_request_to_idx" ON "date_requests" USING btree ("to_user_id");
--> statement-breakpoint
CREATE INDEX "date_request_status_idx" ON "date_requests" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "date_match_request_idx" ON "date_matches" USING btree ("request_id");
--> statement-breakpoint
CREATE INDEX "date_match_users_idx" ON "date_matches" USING btree ("user_a_id","user_b_id");
--> statement-breakpoint
CREATE INDEX "date_feedback_match_idx" ON "date_feedback" USING btree ("date_match_id");
--> statement-breakpoint
CREATE INDEX "date_feedback_user_idx" ON "date_feedback" USING btree ("user_id");
