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
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"user_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
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
CREATE TABLE "daily_match_skips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"skipped_user_id" text NOT NULL,
	"skipped_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "date_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"candidate_pair_id" uuid,
	"user_a_id" text NOT NULL,
	"user_b_id" text NOT NULL,
	"vibe" text NOT NULL,
	"call_completed" boolean DEFAULT false,
	"user_a_confirmed" boolean DEFAULT false,
	"user_b_confirmed" boolean DEFAULT false,
	"status" text DEFAULT 'pending_setup' NOT NULL,
	"venue_name" text,
	"venue_address" text,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "event_rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'going',
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
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"user1_id" text NOT NULL,
	"user2_id" text NOT NULL,
	"user1_typing" boolean DEFAULT false,
	"user2_typing" boolean DEFAULT false,
	"user1_opened" boolean DEFAULT false,
	"user2_opened" boolean DEFAULT false,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"match_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
	"username" text,
	"qualities" json,
	"prompts" json,
	"about_me" text,
	"height" text,
	"education" text,
	"smoking" text,
	"politics" text,
	"religion" text,
	"languages" json,
	"interested_in" json,
	"personality_answers" jsonb,
	"lifestyle_answers" jsonb,
	"ai_consent_granted" boolean DEFAULT false NOT NULL,
	"ai_consent_updated_at" timestamp,
	"personality_summary" text,
	"embedding" vector(3072),
	"embedding_updated_at" timestamp
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
CREATE TABLE "saved_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL
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
	"deleted_at" timestamp,
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
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_analytics" ADD CONSTRAINT "agent_analytics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_context" ADD CONSTRAINT "agent_context_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blind_dates" ADD CONSTRAINT "blind_dates_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campus_events" ADD CONSTRAINT "campus_events_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_pair_history" ADD CONSTRAINT "candidate_pair_history_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_pair_history" ADD CONSTRAINT "candidate_pair_history_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_pairs" ADD CONSTRAINT "candidate_pairs_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_pairs" ADD CONSTRAINT "candidate_pairs_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_match_skips" ADD CONSTRAINT "daily_match_skips_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_match_skips" ADD CONSTRAINT "daily_match_skips_skipped_user_id_user_id_fk" FOREIGN KEY ("skipped_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_feedback" ADD CONSTRAINT "date_feedback_date_match_id_date_matches_id_fk" FOREIGN KEY ("date_match_id") REFERENCES "public"."date_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_feedback" ADD CONSTRAINT "date_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_request_id_date_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."date_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_candidate_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("candidate_pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_matches" ADD CONSTRAINT "date_matches_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_requests" ADD CONSTRAINT "date_requests_from_user_id_user_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "date_requests" ADD CONSTRAINT "date_requests_to_user_id_user_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_campus_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."campus_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_invite_links" ADD CONSTRAINT "hype_invite_links_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_vouches" ADD CONSTRAINT "hype_vouches_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hype_vouches" ADD CONSTRAINT "hype_vouches_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_missions" ADD CONSTRAINT "match_missions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_candidate_pair_id_candidate_pairs_id_fk" FOREIGN KEY ("candidate_pair_id") REFERENCES "public"."candidate_pairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_user_a_id_user_id_fk" FOREIGN KEY ("user_a_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_user_b_id_user_id_fk" FOREIGN KEY ("user_b_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_legacy_match_id_matches_id_fk" FOREIGN KEY ("legacy_match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mutual_matches" ADD CONSTRAINT "mutual_matches_legacy_date_match_id_date_matches_id_fk" FOREIGN KEY ("legacy_date_match_id") REFERENCES "public"."date_matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_posted_by_user_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_applications" ADD CONSTRAINT "opportunity_applications_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewer_id_user_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_viewed_id_user_id_fk" FOREIGN KEY ("viewed_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_posts" ADD CONSTRAINT "pulse_posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_post_id_pulse_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."pulse_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_profiles" ADD CONSTRAINT "starred_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "starred_profiles" ADD CONSTRAINT "starred_profiles_starred_id_user_id_fk" FOREIGN KEY ("starred_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiper_id_user_id_fk" FOREIGN KEY ("swiper_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiped_id_user_id_fk" FOREIGN KEY ("swiped_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_user1_id_user_id_fk" FOREIGN KEY ("user1_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vibe_checks" ADD CONSTRAINT "vibe_checks_user2_id_user_id_fk" FOREIGN KEY ("user2_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_drops" ADD CONSTRAINT "weekly_drops_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingman_links" ADD CONSTRAINT "wingman_links_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingman_packs" ADD CONSTRAINT "wingman_packs_profile_user_id_user_id_fk" FOREIGN KEY ("profile_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingman_packs" ADD CONSTRAINT "wingman_packs_link_id_wingman_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."wingman_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wingman_submissions" ADD CONSTRAINT "wingman_submissions_link_id_wingman_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."wingman_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_user_idx" ON "agent_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_event_idx" ON "agent_analytics" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_created_idx" ON "agent_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "agent_context_user_idx" ON "agent_context" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_event_type_idx" ON "analytics_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "analytics_event_user_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_event_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "analytics_event_type_created_idx" ON "analytics_events" USING btree ("event_type","created_at");--> statement-breakpoint
CREATE INDEX "blind_dates_users_idx" ON "blind_dates" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "blind_dates_status_idx" ON "blind_dates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blocks_blocker_idx" ON "blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "blocks_unique_idx" ON "blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "event_university_idx" ON "campus_events" USING btree ("university");--> statement-breakpoint
CREATE INDEX "event_category_idx" ON "campus_events" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_start_time_idx" ON "campus_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "event_creator_idx" ON "campus_events" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "event_public_idx" ON "campus_events" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "candidate_pair_history_pair_idx" ON "candidate_pair_history" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "candidate_pair_history_actor_idx" ON "candidate_pair_history" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "candidate_pair_history_event_idx" ON "candidate_pair_history" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_pairs_unique_pair_status_idx" ON "candidate_pairs" USING btree ("user_a_id","user_b_id","status");--> statement-breakpoint
CREATE INDEX "candidate_pairs_user_a_idx" ON "candidate_pairs" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX "candidate_pairs_user_b_idx" ON "candidate_pairs" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX "candidate_pairs_status_idx" ON "candidate_pairs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "candidate_pairs_expires_idx" ON "candidate_pairs" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "candidate_pairs_active_exposure_a_idx" ON "candidate_pairs" USING btree ("user_a_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "candidate_pairs_active_exposure_b_idx" ON "candidate_pairs" USING btree ("user_b_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "daily_skip_user_idx" ON "daily_match_skips" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_skip_user_skipped_idx" ON "daily_match_skips" USING btree ("user_id","skipped_user_id");--> statement-breakpoint
CREATE INDEX "daily_skip_at_idx" ON "daily_match_skips" USING btree ("skipped_at");--> statement-breakpoint
CREATE INDEX "date_feedback_match_idx" ON "date_feedback" USING btree ("date_match_id");--> statement-breakpoint
CREATE INDEX "date_feedback_user_idx" ON "date_feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "date_match_request_idx" ON "date_matches" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "date_match_candidate_pair_idx" ON "date_matches" USING btree ("candidate_pair_id");--> statement-breakpoint
CREATE INDEX "date_match_users_idx" ON "date_matches" USING btree ("user_a_id","user_b_id");--> statement-breakpoint
CREATE INDEX "date_request_from_idx" ON "date_requests" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "date_request_to_idx" ON "date_requests" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "date_request_status_idx" ON "date_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rsvp_event_idx" ON "event_rsvps" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "rsvp_user_idx" ON "event_rsvps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rsvp_unique_idx" ON "event_rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "hype_links_token_idx" ON "hype_invite_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "hype_vouches_profile_idx" ON "hype_vouches" USING btree ("profile_user_id");--> statement-breakpoint
CREATE INDEX "missions_match_idx" ON "match_missions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "missions_status_idx" ON "match_missions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "missions_deadline_idx" ON "match_missions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "match_users_idx" ON "matches" USING btree ("user1_id","user2_id");--> statement-breakpoint
CREATE INDEX "last_message_idx" ON "matches" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "match_id_idx" ON "messages" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "match_id_created_at_idx" ON "messages" USING btree ("match_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mutual_matches_candidate_pair_unique_idx" ON "mutual_matches" USING btree ("candidate_pair_id");--> statement-breakpoint
CREATE INDEX "mutual_matches_user_a_idx" ON "mutual_matches" USING btree ("user_a_id");--> statement-breakpoint
CREATE INDEX "mutual_matches_user_b_idx" ON "mutual_matches" USING btree ("user_b_id");--> statement-breakpoint
CREATE INDEX "mutual_matches_status_idx" ON "mutual_matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mutual_matches_legacy_match_idx" ON "mutual_matches" USING btree ("legacy_match_id");--> statement-breakpoint
CREATE INDEX "mutual_matches_legacy_date_match_idx" ON "mutual_matches" USING btree ("legacy_date_match_id");--> statement-breakpoint
CREATE INDEX "opportunity_category_idx" ON "opportunities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "opportunity_deadline_idx" ON "opportunities" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "opportunity_is_active_idx" ON "opportunities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "opportunity_is_featured_idx" ON "opportunities" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "opportunity_posted_at_idx" ON "opportunities" USING btree ("posted_at");--> statement-breakpoint
CREATE INDEX "opportunity_organization_idx" ON "opportunities" USING btree ("organization");--> statement-breakpoint
CREATE INDEX "application_user_idx" ON "opportunity_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "application_opp_idx" ON "opportunity_applications" USING btree ("opportunity_id");--> statement-breakpoint
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
CREATE INDEX "profile_ai_consent_idx" ON "profiles" USING btree ("ai_consent_granted");--> statement-breakpoint
CREATE INDEX "profile_education_idx" ON "profiles" USING btree ("education");--> statement-breakpoint
CREATE INDEX "profile_smoking_idx" ON "profiles" USING btree ("smoking");--> statement-breakpoint
CREATE INDEX "profile_politics_idx" ON "profiles" USING btree ("politics");--> statement-breakpoint
CREATE INDEX "pulse_posts_created_idx" ON "pulse_posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pulse_posts_category_idx" ON "pulse_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pulse_posts_author_idx" ON "pulse_posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "pulse_reactions_post_idx" ON "pulse_reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "pulse_reactions_unique_idx" ON "pulse_reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "reported_user_idx" ON "reports" USING btree ("reported_user_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "saved_opportunity_user_idx" ON "saved_opportunities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_opportunity_opp_idx" ON "saved_opportunities" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "saved_opportunity_unique_idx" ON "saved_opportunities" USING btree ("user_id","opportunity_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_sessions_active_idx" ON "study_sessions" USING btree ("is_active","university");--> statement-breakpoint
CREATE INDEX "study_sessions_user_idx" ON "study_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_sessions_expires_idx" ON "study_sessions" USING btree ("available_until");--> statement-breakpoint
CREATE INDEX "swipe_swiper_idx" ON "swipes" USING btree ("swiper_id");--> statement-breakpoint
CREATE INDEX "swipe_swiped_idx" ON "swipes" USING btree ("swiped_id");--> statement-breakpoint
CREATE INDEX "swipe_created_at_idx" ON "swipes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "swipe_combo_idx" ON "swipes" USING btree ("swiper_id","swiped_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_created_at_idx" ON "user" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_last_active_idx" ON "user" USING btree ("last_active");--> statement-breakpoint
CREATE INDEX "user_deleted_at_idx" ON "user" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "vibe_checks_match_idx" ON "vibe_checks" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "vibe_checks_status_idx" ON "vibe_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drops_user_idx" ON "weekly_drops" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "drops_status_idx" ON "weekly_drops" USING btree ("status");--> statement-breakpoint
CREATE INDEX "drops_expires_idx" ON "weekly_drops" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "wingman_links_profile_idx" ON "wingman_links" USING btree ("profile_user_id");--> statement-breakpoint
CREATE INDEX "wingman_links_expires_idx" ON "wingman_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "wingman_links_profile_round_idx" ON "wingman_links" USING btree ("profile_user_id","round_number");--> statement-breakpoint
CREATE INDEX "wingman_packs_profile_idx" ON "wingman_packs" USING btree ("profile_user_id");--> statement-breakpoint
CREATE INDEX "wingman_packs_profile_round_idx" ON "wingman_packs" USING btree ("profile_user_id","round_number");--> statement-breakpoint
CREATE INDEX "wingman_submissions_link_idx" ON "wingman_submissions" USING btree ("link_id");