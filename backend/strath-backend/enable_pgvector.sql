-- ============================================
-- StrathSpace Agentic AI Migration
-- Run this BEFORE running drizzle-kit generate/push
-- ============================================

-- Step 1: Enable pgvector extension (must be enabled on Neon dashboard first)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add agentic columns to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_summary TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP;

-- Step 3: Create HNSW index for fast similarity search
-- This index makes cosine similarity queries fast (< 50ms for 100K+ profiles)
CREATE INDEX IF NOT EXISTS profiles_embedding_hnsw_idx 
  ON profiles USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Verify: Check the extension is loaded
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify: Check the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('personality_summary', 'embedding', 'embedding_updated_at');
