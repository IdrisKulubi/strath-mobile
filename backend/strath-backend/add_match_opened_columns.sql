-- Add user1_opened and user2_opened columns to matches table
-- These track whether each user has viewed/opened the match

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS user1_opened BOOLEAN DEFAULT false;

ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS user2_opened BOOLEAN DEFAULT false;

-- Set existing matches as already opened (since they existed before this feature)
UPDATE matches SET user1_opened = true, user2_opened = true WHERE user1_opened IS NULL OR user2_opened IS NULL;
