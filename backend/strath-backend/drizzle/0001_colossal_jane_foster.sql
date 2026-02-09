CREATE TABLE "agent_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_context" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"learned_preferences" jsonb DEFAULT '{}'::jsonb,
	"query_history" jsonb DEFAULT '[]'::jsonb,
	"match_feedback" jsonb DEFAULT '[]'::jsonb,
	"last_agent_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_context_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "blind_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"match_id" text,
	"location" text NOT NULL,
	"suggested_time" timestamp NOT NULL,
	"code_word" text NOT NULL,
	"user1_opted_in" boolean DEFAULT false,
	"user2_opted_in" boolean DEFAULT false,
	"status" text DEFAULT 'proposed',
	"user1_feedback" text,
	"user2_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campus_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"cover_image" text,
	"university" text NOT NULL,
	"location" text,
	"is_virtual" boolean DEFAULT false,
	"virtual_link" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"creator_id" text NOT NULL,
	"organizer_name" text,
	"max_attendees" integer,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'going',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hype_invite_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" text NOT NULL,
	"token" text NOT NULL,
	"max_uses" integer DEFAULT 5,
	"current_uses" integer DEFAULT 0,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hype_invite_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "hype_vouches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_user_id" text NOT NULL,
	"author_user_id" text,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"is_approved" boolean DEFAULT true,
	"is_flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" text NOT NULL,
	"mission_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"emoji" text NOT NULL,
	"suggested_location" text,
	"suggested_time" text,
	"deadline" timestamp NOT NULL,
	"user1_accepted" boolean DEFAULT false,
	"user2_accepted" boolean DEFAULT false,
	"user1_completed" boolean DEFAULT false,
	"user2_completed" boolean DEFAULT false,
	"status" text DEFAULT 'proposed',
	"user1_rating" text,
	"user2_rating" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"organization" text NOT NULL,
	"logo" text,
	"location" text,
	"location_type" text DEFAULT 'onsite',
	"deadline" timestamp,
	"application_url" text,
	"requirements" json,
	"salary" text,
	"stipend" text,
	"duration" text,
	"slots" integer,
	"is_active" boolean DEFAULT true,
	"is_featured" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"posted_by" text,
	"contact_email" text,
	"contact_phone" text,
	"tags" json,
	"posted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "pulse_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general',
	"is_anonymous" boolean DEFAULT true,
	"fire_count" integer DEFAULT 0,
	"skull_count" integer DEFAULT 0,
	"heart_count" integer DEFAULT 0,
	"reveal_requests" jsonb DEFAULT '[]'::jsonb,
	"is_flagged" boolean DEFAULT false,
	"is_hidden" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pulse_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"location_name" text NOT NULL,
	"university" text NOT NULL,
	"available_until" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"subject" text,
	"vibe" text,
	"open_to_anyone" boolean DEFAULT true,
	"preferred_gender" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vibe_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" text NOT NULL,
	"room_name" text NOT NULL,
	"room_url" text,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"duration_seconds" integer,
	"user1_decision" text,
	"user2_decision" text,
	"both_agreed_to_meet" boolean DEFAULT false,
	"suggested_topic" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vibe_checks_room_name_unique" UNIQUE("room_name")
);
--> statement-breakpoint
CREATE TABLE "weekly_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"matched_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"drop_number" integer NOT NULL,
	"delivered_at" timestamp,
	"opened_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "matches" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "match_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "user1_opened" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "user2_opened" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "qualities" json;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "prompts" json;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "about_me" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "height" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "education" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "smoking" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "politics" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "religion" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "languages" json;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "interested_in" json;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "personality_summary" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "embedding_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "agent_analytics" ADD CONSTRAINT "agent_analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_context" ADD CONSTRAINT "agent_context_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_events" ADD CONSTRAINT "campus_events_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_campus_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."campus_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_invite_links" ADD CONSTRAINT "hype_invite_links_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_vouches" ADD CONSTRAINT "hype_vouches_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_vouches" ADD CONSTRAINT "hype_vouches_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_missions" ADD CONSTRAINT "match_missions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_posts" ADD CONSTRAINT "pulse_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_post_id_pulse_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pulse_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_drops" ADD CONSTRAINT "weekly_drops_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_user_idx" ON "agent_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_event_idx" ON "agent_analytics" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_created_idx" ON "agent_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agent_context_user_idx" ON "agent_context" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blind_dates_users_idx" ON "blind_dates" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "blind_dates_status_idx" ON "blind_dates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_university_idx" ON "campus_events" USING btree ("university");--> statement-breakpoint
CREATE INDEX "event_category_idx" ON "campus_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_start_time_idx" ON "campus_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "event_creator_idx" ON "campus_events" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "event_public_idx" ON "campus_events" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "rsvp_event_idx" ON "event_rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_user_idx" ON "event_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rsvp_unique_idx" ON "event_rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "hype_links_token_idx" ON "hype_invite_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "hype_vouches_profile_idx" ON "hype_vouches" USING btree ("profile_user_id");--> statement-breakpoint
CREATE INDEX "missions_match_idx" ON "match_missions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "missions_status_idx" ON "match_missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "missions_deadline_idx" ON "match_missions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "opportunity_category_idx" ON "opportunities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "opportunity_deadline_idx" ON "opportunities" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "opportunity_is_active_idx" ON "opportunities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "opportunity_is_featured_idx" ON "opportunities" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "opportunity_posted_at_idx" ON "opportunities" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "opportunity_organization_idx" ON "opportunities" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "application_user_idx" ON "opportunity_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_opp_idx" ON "opportunity_applications" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "pulse_posts_created_idx" ON "pulse_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pulse_posts_category_idx" ON "pulse_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pulse_posts_author_idx" ON "pulse_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "pulse_reactions_post_idx" ON "pulse_reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "pulse_reactions_unique_idx" ON "pulse_reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "saved_opportunity_user_idx" ON "saved_opportunities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_opportunity_opp_idx" ON "saved_opportunities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "saved_opportunity_unique_idx" ON "saved_opportunities" USING btree ("user_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "study_sessions_active_idx" ON "study_sessions" USING btree ("is_active","university");--> statement-breakpoint
CREATE INDEX "study_sessions_user_idx" ON "study_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_sessions_expires_idx" ON "study_sessions" USING btree ("available_until");--> statement-breakpoint
CREATE INDEX "vibe_checks_match_idx" ON "vibe_checks" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "vibe_checks_status_idx" ON "vibe_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drops_user_idx" ON "weekly_drops" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drops_status_idx" ON "weekly_drops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drops_expires_idx" ON "weekly_drops" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "blocks_blocker_idx" ON "blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "blocks_unique_idx" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "profile_education_idx" ON "profiles" USING btree ("education");--> statement-breakpoint
CREATE INDEX "profile_smoking_idx" ON "profiles" USING btree ("smoking");--> statement-breakpoint
CREATE INDEX "profile_politics_idx" ON "profiles" USING btree ("politics");--> statement-breakpoint
CREATE INDEX "user_deleted_at_idx" ON "user" USING btree ("deleted_at");