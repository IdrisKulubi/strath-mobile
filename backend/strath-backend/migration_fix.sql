-- SQL to add missing columns to the 'user' table for StrathSpace mobile app features
-- Run this in your database query tool (pgAdmin, Neon Console, etc.)

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "push_token" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone_number" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "profile_photo" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_online" boolean DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_active" timestamp DEFAULT now() NOT NULL;

-- Note: You may also need to create the 'profiles' table if it doesn't exist.
-- Check if 'profiles' table exists. If not, you will need to run the CREATE TABLE statement for it.
