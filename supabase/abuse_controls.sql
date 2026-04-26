-- ============================================================
-- abuse_controls.sql
-- Server-side abuse controls for benchmark submissions.
-- Run in Supabase SQL Editor AFTER schema.sql.
-- ============================================================

-- ============================================================
-- 1. Input sanitization (runs first — trims whitespace, caps
--    text lengths, rejects blank required fields)
-- ============================================================
CREATE OR REPLACE FUNCTION sanitize_benchmark_inputs()
RETURNS TRIGGER AS $$
BEGIN
  NEW.model_id    := LEFT(TRIM(NEW.model_id),    200);
  NEW.quant_level := LEFT(TRIM(NEW.quant_level),  50);
  NEW.gpu_name    := LEFT(TRIM(NEW.gpu_name),    150);

  IF NEW.cpu_name IS NOT NULL THEN
    NEW.cpu_name := LEFT(TRIM(NEW.cpu_name), 150);
  END IF;
  IF NEW.runtime IS NOT NULL THEN
    NEW.runtime := TRIM(NEW.runtime);
  END IF;
  IF NEW.notes IS NOT NULL THEN
    NEW.notes := LEFT(TRIM(NEW.notes), 500);
    IF NEW.notes = '' THEN NEW.notes := NULL; END IF;
  END IF;

  -- Reject blank required fields after trimming
  IF NEW.model_id = '' THEN
    RAISE EXCEPTION 'invalid_input' USING HINT = 'model_id cannot be blank';
  END IF;
  IF NEW.gpu_name = '' THEN
    RAISE EXCEPTION 'invalid_input' USING HINT = 'gpu_name cannot be blank';
  END IF;
  IF NEW.quant_level = '' THEN
    RAISE EXCEPTION 'invalid_input' USING HINT = 'quant_level cannot be blank';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sanitize_benchmark ON benchmarks;
CREATE TRIGGER sanitize_benchmark
  BEFORE INSERT OR UPDATE ON benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_benchmark_inputs();


-- ============================================================
-- 2. Rate limiting: max 10 submissions per user per hour.
--    Truly server-side — cannot be bypassed from the client.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_benchmark_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT COUNT(*)
    INTO recent_count
    FROM benchmarks
   WHERE user_id    = NEW.user_id
     AND created_at > (NOW() - INTERVAL '1 hour');

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Max 10 submissions per hour per account.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_benchmark_rate_limit ON benchmarks;
CREATE TRIGGER check_benchmark_rate_limit
  BEFORE INSERT ON benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_benchmark_rate_limit();


-- ============================================================
-- 3. Duplicate prevention: max 1 submission per
--    (user_id, model_id, quant_level, gpu_name) per 24 hours.
--    Allows legitimate re-submissions after driver/hw changes.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_benchmark_dedup()
RETURNS TRIGGER AS $$
DECLARE
  dupe_count INT;
BEGIN
  SELECT COUNT(*)
    INTO dupe_count
    FROM benchmarks
   WHERE user_id     = NEW.user_id
     AND model_id    = NEW.model_id
     AND quant_level = NEW.quant_level
     AND gpu_name    = NEW.gpu_name
     AND created_at  > (NOW() - INTERVAL '24 hours');

  IF dupe_count >= 1 THEN
    RAISE EXCEPTION 'duplicate_submission'
      USING HINT = 'Already submitted for this model/GPU combination in the last 24 hours.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_benchmark_dedup ON benchmarks;
CREATE TRIGGER check_benchmark_dedup
  BEFORE INSERT ON benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_benchmark_dedup();


-- ============================================================
-- Verification: list active triggers on benchmarks table
-- ============================================================
-- SELECT trigger_name, event_manipulation, action_timing
--   FROM information_schema.triggers
--  WHERE event_object_table = 'benchmarks'
--  ORDER BY action_timing, trigger_name;
