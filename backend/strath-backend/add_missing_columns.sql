-- Add missing columns to profiles table
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "university" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "course" text;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "year_of_study" integer;
