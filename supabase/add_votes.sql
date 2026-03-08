-- Migration: Add voting system for benchmarks
-- Run this AFTER the initial schema.sql has been executed

-- Votes table for community validation
CREATE TABLE IF NOT EXISTS benchmark_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  benchmark_id UUID REFERENCES benchmarks(id) ON DELETE CASCADE NOT NULL,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 = downvote, 1 = upvote
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only vote once per benchmark
  UNIQUE(user_id, benchmark_id)
);

-- Index for vote lookups
CREATE INDEX IF NOT EXISTS idx_benchmark_votes_benchmark ON benchmark_votes(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_votes_user ON benchmark_votes(user_id);

-- View for benchmarks with vote counts
CREATE OR REPLACE VIEW benchmarks_with_votes AS
SELECT
  b.*,
  COALESCE(v.upvotes, 0)::INT as upvotes,
  COALESCE(v.downvotes, 0)::INT as downvotes,
  COALESCE(v.upvotes, 0) - COALESCE(v.downvotes, 0) as vote_score
FROM benchmarks b
LEFT JOIN (
  SELECT
    benchmark_id,
    SUM(CASE WHEN vote_type = 1 THEN 1 ELSE 0 END) as upvotes,
    SUM(CASE WHEN vote_type = -1 THEN 1 ELSE 0 END) as downvotes
  FROM benchmark_votes
  GROUP BY benchmark_id
) v ON b.id = v.benchmark_id
WHERE NOT b.flagged;

-- RLS for votes
ALTER TABLE benchmark_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Public read votes" ON benchmark_votes;
DROP POLICY IF EXISTS "Users can insert own votes" ON benchmark_votes;
DROP POLICY IF EXISTS "Users can update own votes" ON benchmark_votes;
DROP POLICY IF EXISTS "Users can delete own votes" ON benchmark_votes;

-- Anyone can read votes
CREATE POLICY "Public read votes" ON benchmark_votes
  FOR SELECT
  USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Users can insert own votes" ON benchmark_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own votes
CREATE POLICY "Users can update own votes" ON benchmark_votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes" ON benchmark_votes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant access to the views
GRANT SELECT ON benchmarks_with_votes TO anon, authenticated;
