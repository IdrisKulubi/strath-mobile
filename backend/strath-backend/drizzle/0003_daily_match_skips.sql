CREATE TABLE "daily_match_skips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"skipped_user_id" text NOT NULL,
	"skipped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_match_skips" ADD CONSTRAINT "daily_match_skips_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_match_skips" ADD CONSTRAINT "daily_match_skips_skipped_user_id_user_id_fk" FOREIGN KEY ("skipped_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "daily_skip_user_idx" ON "daily_match_skips" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "daily_skip_user_skipped_idx" ON "daily_match_skips" USING btree ("user_id","skipped_user_id");
--> statement-breakpoint
CREATE INDEX "daily_skip_at_idx" ON "daily_match_skips" USING btree ("skipped_at");
