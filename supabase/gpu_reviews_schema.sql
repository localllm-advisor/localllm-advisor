-- GPU Reviews for LLM use
CREATE TABLE gpu_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gpu_name TEXT NOT NULL,

  -- Ratings (1-5)
  rating_overall INT NOT NULL CHECK (rating_overall >= 1 AND rating_overall <= 5),
  rating_llm_performance INT CHECK (rating_llm_performance >= 1 AND rating_llm_performance <= 5),
  rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5),
  rating_noise_temps INT CHECK (rating_noise_temps >= 1 AND rating_noise_temps <= 5),

  -- Content
  title TEXT CHECK (char_length(title) <= 150),
  body TEXT NOT NULL CHECK (char_length(body) >= 20 AND char_length(body) <= 3000),
  pros TEXT[],
  cons TEXT[],

  -- LLM-specific context
  models_tested TEXT[],           -- e.g., ['llama3.1:70b', 'qwen2.5:32b']
  typical_speed_tps INT,          -- tokens/sec they typically get
  vram_usage_percent INT,         -- how much VRAM they use
  use_case TEXT,                  -- 'chat', 'coding', 'reasoning', 'mixed'

  -- "Best for" tags
  best_for TEXT[] DEFAULT '{}',   -- ['budget', 'large_models', 'multi_gpu', 'quiet']

  -- Purchase info
  purchase_price_usd INT,
  months_owned INT,

  -- Stats
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,

  -- Moderation
  is_hidden BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, gpu_name)  -- One review per user per GPU
);

-- Indexes
CREATE INDEX idx_gpu_reviews_gpu ON gpu_reviews(gpu_name);
CREATE INDEX idx_gpu_reviews_rating ON gpu_reviews(rating_overall DESC);

-- RLS
ALTER TABLE gpu_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read reviews" ON gpu_reviews
  FOR SELECT USING (NOT is_hidden);

CREATE POLICY "Users insert own reviews" ON gpu_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews" ON gpu_reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews" ON gpu_reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Review votes
CREATE TABLE gpu_review_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  review_id UUID REFERENCES gpu_reviews(id) ON DELETE CASCADE NOT NULL,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

ALTER TABLE gpu_review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read votes" ON gpu_review_votes FOR SELECT USING (true);
CREATE POLICY "Users vote" ON gpu_review_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger for vote counts
CREATE OR REPLACE FUNCTION update_review_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE gpu_reviews SET
      upvotes = upvotes + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE 0 END
    WHERE id = NEW.review_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE gpu_reviews SET
      upvotes = GREATEST(upvotes - CASE WHEN OLD.vote_type = 1 THEN 1 ELSE 0 END, 0),
      downvotes = GREATEST(downvotes - CASE WHEN OLD.vote_type = -1 THEN 1 ELSE 0 END, 0)
    WHERE id = OLD.review_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    UPDATE gpu_reviews SET
      upvotes = upvotes + CASE WHEN NEW.vote_type = 1 THEN 1 ELSE -1 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = -1 THEN 1 ELSE -1 END
    WHERE id = NEW.review_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_review_votes
AFTER INSERT OR UPDATE OR DELETE ON gpu_review_votes
FOR EACH ROW EXECUTE FUNCTION update_review_votes();

-- Aggregate view
CREATE OR REPLACE VIEW gpu_review_stats AS
SELECT
  gpu_name,
  COUNT(*) as review_count,
  ROUND(AVG(rating_overall)::NUMERIC, 1) as avg_rating,
  ROUND(AVG(rating_llm_performance)::NUMERIC, 1) as avg_llm_performance,
  ROUND(AVG(rating_value)::NUMERIC, 1) as avg_value,
  ROUND(AVG(typical_speed_tps)::NUMERIC, 0) as avg_speed_tps
FROM gpu_reviews
WHERE NOT is_hidden
GROUP BY gpu_name;

GRANT SELECT ON gpu_review_stats TO anon, authenticated;
