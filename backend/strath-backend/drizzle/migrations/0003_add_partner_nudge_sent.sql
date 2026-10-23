-- Add partner_nudge_sent column to vibe_checks table
ALTER TABLE "vibe_checks" ADD COLUMN IF NOT EXISTS "partner_nudge_sent" boolean DEFAULT false;
