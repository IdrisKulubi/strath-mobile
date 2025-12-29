CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"phone_number" text,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"user1_typing" boolean DEFAULT false,
	"user2_typing" boolean DEFAULT false,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"match_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"viewer_id" text NOT NULL,
	"viewed_id" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"source" text DEFAULT 'VIEW_MORE',
	"view_duration" integer
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bio" text,
	"age" integer,
	"gender" text,
	"role" text DEFAULT 'user',
	"interests" json,
	"photos" json,
	"is_visible" boolean DEFAULT true,
	"last_active" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"is_complete" boolean DEFAULT false,
	"profile_completed" boolean DEFAULT false,
	"looking_for" text,
	"course" text,
	"year_of_study" integer,
	"university" text,
	"instagram" text,
	"spotify" text,
	"snapchat" text,
	"profile_photo" text,
	"phone_number" text,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"is_match" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"anonymous" boolean DEFAULT false,
	"anonymous_avatar" text,
	"anonymous_reveal_requested" boolean DEFAULT false,
	"drinking_preference" text,
	"workout_frequency" text,
	"social_media_usage" text,
	"sleeping_habits" text,
	"personality_type" text,
	"communication_style" text,
	"love_language" text,
	"zodiac_sign" text,
	"visibility_mode" text DEFAULT 'standard',
	"incognito_mode" boolean DEFAULT false,
	"discovery_paused" boolean DEFAULT false,
	"read_receipts_enabled" boolean DEFAULT true,
	"show_active_status" boolean DEFAULT true,
	"username" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"admin_notes" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "starred_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"starred_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "swipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"swiper_id" text NOT NULL,
	"swiped_id" text NOT NULL,
	"is_like" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user',
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"is_online" boolean DEFAULT false,
	"profile_photo" text,
	"phone_number" text,
	"push_token" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_user_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewed_id_user_id_fk" FOREIGN KEY ("viewed_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_profiles" ADD CONSTRAINT "starred_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_profiles" ADD CONSTRAINT "starred_profiles_starred_id_user_id_fk" FOREIGN KEY ("starred_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiper_id_user_id_fk" FOREIGN KEY ("swiper_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiped_id_user_id_fk" FOREIGN KEY ("swiped_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "match_users_idx" ON "matches" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "last_message_idx" ON "matches" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "match_id_idx" ON "messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_id_created_at_idx" ON "messages" USING btree ("match_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_views_viewer_idx" ON "profile_views" USING btree ("viewer_id");--> statement-breakpoint
CREATE INDEX "profile_views_viewed_idx" ON "profile_views" USING btree ("viewed_id");--> statement-breakpoint
CREATE INDEX "profile_views_viewed_at_idx" ON "profile_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "profile_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profile_is_visible_idx" ON "profiles" USING btree ("is_visible");--> statement-breakpoint
CREATE INDEX "profile_gender_idx" ON "profiles" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "profile_last_active_idx" ON "profiles" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "profile_completed_idx" ON "profiles" USING btree ("profile_completed");--> statement-breakpoint
CREATE INDEX "profile_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profile_anonymous_idx" ON "profiles" USING btree ("anonymous");--> statement-breakpoint
CREATE INDEX "reported_user_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "swipe_swiper_idx" ON "swipes" USING btree ("swiper_id");--> statement-breakpoint
CREATE INDEX "swipe_swiped_idx" ON "swipes" USING btree ("swiped_id");--> statement-breakpoint
CREATE INDEX "swipe_created_at_idx" ON "swipes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "swipe_combo_idx" ON "swipes" USING btree ("swiper_id","swiped_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_last_active_idx" ON "user" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");