-- GPU Price Tracking & Alerts Schema
-- Run this in Supabase SQL Editor after the main schema

-- GPU price history table
CREATE TABLE IF NOT EXISTS gpu_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gpu_name TEXT NOT NULL,
  price_usd INT NOT NULL CHECK (price_usd > 0),
  retailer TEXT NOT NULL, -- 'newegg', 'amazon', 'bestbuy'
  retailer_url TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  scraped_date DATE DEFAULT CURRENT_DATE
);

-- Unique constraint to prevent duplicate entries per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_gpu_prices_unique_daily
  ON gpu_prices (gpu_name, retailer, scraped_date);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gpu_prices_gpu_name ON gpu_prices(gpu_name);
CREATE INDEX IF NOT EXISTS idx_gpu_prices_scraped_at ON gpu_prices(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_gpu_prices_retailer ON gpu_prices(retailer);

-- Price alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gpu_name TEXT NOT NULL,
  target_price_usd INT NOT NULL CHECK (target_price_usd > 0),
  alert_type TEXT DEFAULT 'below' CHECK (alert_type IN ('below', 'above', 'any_change')),
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price alerts
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_gpu ON price_alerts(gpu_name);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = TRUE;

-- View for GPU price statistics
CREATE OR REPLACE VIEW gpu_price_stats AS
SELECT
  gpu_name,
  -- Current price (most recent)
  (SELECT price_usd FROM gpu_prices p2
   WHERE p2.gpu_name = p.gpu_name
   ORDER BY scraped_at DESC LIMIT 1) as current_price_usd,
  -- 30-day statistics
  ROUND(AVG(price_usd) FILTER (WHERE scraped_at > NOW() - INTERVAL '30 days'))::INT as avg_30d,
  MIN(price_usd) FILTER (WHERE scraped_at > NOW() - INTERVAL '30 days') as min_30d,
  MAX(price_usd) FILTER (WHERE scraped_at > NOW() - INTERVAL '30 days') as max_30d,
  -- Price 7 days ago for trend calculation
  (SELECT price_usd FROM gpu_prices p3
   WHERE p3.gpu_name = p.gpu_name
     AND p3.scraped_at <= NOW() - INTERVAL '7 days'
   ORDER BY scraped_at DESC LIMIT 1) as price_7d_ago,
  -- Count of price points
  COUNT(*) FILTER (WHERE scraped_at > NOW() - INTERVAL '30 days') as data_points_30d
FROM gpu_prices p
GROUP BY gpu_name;

-- RLS for gpu_prices (public read)
ALTER TABLE gpu_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read gpu_prices" ON gpu_prices
  FOR SELECT
  USING (true);

-- RLS for price_alerts (user-owned)
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own alerts" ON price_alerts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own alerts" ON price_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own alerts" ON price_alerts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own alerts" ON price_alerts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Grant access to the view
GRANT SELECT ON gpu_price_stats TO anon, authenticated;
