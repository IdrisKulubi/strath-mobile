CREATE TABLE "wingman_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" text NOT NULL,
	"round_number" integer NOT NULL,
	"token" text NOT NULL,
	"target_submissions" integer DEFAULT 3,
	"current_submissions" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'collecting',
	"last_submission_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wingman_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "wingman_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"relationship" text,
	"three_words" jsonb DEFAULT '[]'::jsonb,
	"green_flags" jsonb DEFAULT '[]'::jsonb,
	"red_flag_funny" text,
	"hype_note" text,
	"is_flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wingman_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" text NOT NULL,
	"link_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"compiled_summary" jsonb DEFAULT '{}'::jsonb,
	"wingman_prompt" text NOT NULL,
	"match_data" jsonb DEFAULT '[]'::jsonb,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"opened_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "wingman_links" ADD CONSTRAINT "wingman_links_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "wingman_submissions" ADD CONSTRAINT "wingman_submissions_link_id_wingman_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."wingman_links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "wingman_packs" ADD CONSTRAINT "wingman_packs_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "wingman_packs" ADD CONSTRAINT "wingman_packs_link_id_wingman_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."wingman_links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "wingman_links_profile_idx" ON "wingman_links" ("profile_user_id");
--> statement-breakpoint
CREATE INDEX "wingman_links_expires_idx" ON "wingman_links" ("expires_at");
--> statement-breakpoint
CREATE INDEX "wingman_links_profile_round_idx" ON "wingman_links" ("profile_user_id","round_number");
--> statement-breakpoint
CREATE INDEX "wingman_submissions_link_idx" ON "wingman_submissions" ("link_id");
--> statement-breakpoint
CREATE INDEX "wingman_packs_profile_idx" ON "wingman_packs" ("profile_user_id");
--> statement-breakpoint
CREATE INDEX "wingman_packs_profile_round_idx" ON "wingman_packs" ("profile_user_id","round_number");
