ALTER TABLE "mutual_matches"
ADD COLUMN IF NOT EXISTS "user_a_slot_confirmed_at" timestamp,
ADD COLUMN IF NOT EXISTS "user_b_slot_confirmed_at" timestamp,
ADD COLUMN IF NOT EXISTS "slot_confirm_by" timestamp,
ADD COLUMN IF NOT EXISTS "assigned_slot" text;
