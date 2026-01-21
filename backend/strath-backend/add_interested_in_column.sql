-- Migration: Add interested_in column to profiles table
-- This column stores the genders a user wants to see in their discover feed

-- Add the interested_in column (JSON array of gender strings: 'male', 'female', 'other')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interested_in JSONB;

-- Add an index for faster querying
CREATE INDEX IF NOT EXISTS profile_interested_in_idx ON profiles USING GIN (interested_in);

-- Optional: Set default values for existing users based on their gender (opposite gender)
-- Uncomment if you want to auto-populate for existing users:
-- UPDATE profiles SET interested_in = '["female"]'::jsonb WHERE gender = 'male' AND interested_in IS NULL;
-- UPDATE profiles SET interested_in = '["male"]'::jsonb WHERE gender = 'female' AND interested_in IS NULL;
-- UPDATE profiles SET interested_in = '["male", "female", "other"]'::jsonb WHERE gender = 'other' AND interested_in IS NULL;
