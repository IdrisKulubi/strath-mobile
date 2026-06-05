-- Partner-initiated meetup reschedule requests (Phase 1 schema).
-- One pending request per mutual match enforced by partial unique index.

CREATE TABLE IF NOT EXISTS "meetup_reschedule_requests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "mutual_match_id" uuid NOT NULL,
    "requested_by_user_id" text NOT NULL,
    "proposed_slot" text NOT NULL,
    "proposed_scheduled_at" timestamp NOT NULL,
    "proposed_confirm_by" timestamp NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL,
    "decline_reason" text,
    "counter_of_request_id" uuid,
    "chain_root_id" uuid,
    "responded_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
    ALTER TABLE "meetup_reschedule_requests"
        ADD CONSTRAINT "meetup_reschedule_requests_mutual_match_id_mutual_matches_id_fk"
        FOREIGN KEY ("mutual_match_id") REFERENCES "mutual_matches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "meetup_reschedule_requests"
        ADD CONSTRAINT "meetup_reschedule_requests_requested_by_user_id_user_id_fk"
        FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "meetup_reschedule_requests"
        ADD CONSTRAINT "meetup_reschedule_requests_counter_of_request_id_fk"
        FOREIGN KEY ("counter_of_request_id") REFERENCES "meetup_reschedule_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "meetup_reschedule_mutual_status_idx"
    ON "meetup_reschedule_requests" ("mutual_match_id", "status");

CREATE INDEX IF NOT EXISTS "meetup_reschedule_mutual_created_idx"
    ON "meetup_reschedule_requests" ("mutual_match_id", "created_at");

CREATE INDEX IF NOT EXISTS "meetup_reschedule_requested_by_idx"
    ON "meetup_reschedule_requests" ("requested_by_user_id");

CREATE INDEX IF NOT EXISTS "meetup_reschedule_counter_of_idx"
    ON "meetup_reschedule_requests" ("counter_of_request_id");

CREATE UNIQUE INDEX IF NOT EXISTS "meetup_reschedule_one_pending_per_match"
    ON "meetup_reschedule_requests" ("mutual_match_id")
    WHERE "status" = 'pending';

ALTER TABLE "mutual_matches"
    ADD COLUMN IF NOT EXISTS "pending_reschedule_request_id" uuid,
    ADD COLUMN IF NOT EXISTS "reschedule_paused_expiry_at" timestamp;

CREATE INDEX IF NOT EXISTS "mutual_matches_pending_reschedule_request_idx"
    ON "mutual_matches" ("pending_reschedule_request_id");

DO $$ BEGIN
    ALTER TABLE "mutual_matches"
        ADD CONSTRAINT "mutual_matches_pending_reschedule_request_id_fk"
        FOREIGN KEY ("pending_reschedule_request_id") REFERENCES "meetup_reschedule_requests"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
