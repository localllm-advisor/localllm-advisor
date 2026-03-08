-- LocalLLM Advisor - Community Benchmarks Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mvvhlyhjafekkggwlhjl/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Benchmarks table
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Model identification
  model_id TEXT NOT NULL,
  quant_level TEXT NOT NULL,

  -- Hardware info
  gpu_name TEXT NOT NULL,
  gpu_vram_mb INT,
  cpu_name TEXT,
  ram_gb INT,

  -- Benchmark results
  tokens_per_second FLOAT NOT NULL CHECK (tokens_per_second > 0 AND tokens_per_second < 1000),
  prefill_tokens_per_second FLOAT CHECK (prefill_tokens_per_second > 0 AND prefill_tokens_per_second < 10000),
  time_to_first_token_ms FLOAT CHECK (time_to_first_token_ms > 0),
  context_length INT DEFAULT 4096 CHECK (context_length > 0 AND context_length <= 1000000),

  -- Runtime info
  runtime TEXT DEFAULT 'ollama' CHECK (runtime IN ('ollama', 'llama.cpp', 'vllm', 'exllama', 'other')),
  notes TEXT CHECK (char_length(notes) <= 500),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Moderation
  verified BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,
  flag_reason TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_benchmarks_model_id ON benchmarks(model_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_gpu_name ON benchmarks(gpu_name);
CREATE INDEX IF NOT EXISTS idx_benchmarks_model_quant ON benchmarks(model_id, quant_level);
CREATE INDEX IF NOT EXISTS idx_benchmarks_created_at ON benchmarks(created_at DESC);

-- View for aggregated stats
CREATE OR REPLACE VIEW benchmark_stats AS
SELECT
  model_id,
  quant_level,
  gpu_name,
  COUNT(*)::INT as submission_count,
  ROUND(AVG(tokens_per_second)::NUMERIC, 1) as avg_tps,
  ROUND(MIN(tokens_per_second)::NUMERIC, 1) as min_tps,
  ROUND(MAX(tokens_per_second)::NUMERIC, 1) as max_tps,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY tokens_per_second)::NUMERIC, 1) as median_tps
FROM benchmarks
WHERE NOT flagged
GROUP BY model_id, quant_level, gpu_name
HAVING COUNT(*) >= 1;

-- Row Level Security (RLS)
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read non-flagged benchmarks
CREATE POLICY "Public read access" ON benchmarks
  FOR SELECT
  USING (NOT flagged);

-- Policy: Authenticated users can insert their own benchmarks
CREATE POLICY "Users can insert own benchmarks" ON benchmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own benchmarks
CREATE POLICY "Users can update own benchmarks" ON benchmarks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own benchmarks
CREATE POLICY "Users can delete own benchmarks" ON benchmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS benchmarks_updated_at ON benchmarks;
CREATE TRIGGER benchmarks_updated_at
  BEFORE UPDATE ON benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant access to the view
GRANT SELECT ON benchmark_stats TO anon, authenticated;
