-- Migration: Add A/B Testing System for Social Media
-- Date: November 1, 2025
-- Purpose: Enable scientific testing and optimization of social media campaigns

-- ============================================
-- 1. A/B TESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  
  -- Test Details
  name VARCHAR(255) NOT NULL,
  hypothesis TEXT,
  test_type VARCHAR(50) NOT NULL CHECK (test_type IN ('content', 'timing', 'audience', 'format')),
  variable_tested VARCHAR(100) NOT NULL,
  
  -- Platform
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'all')),
  
  -- Timeline
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  actual_end_date TIMESTAMP,
  
  -- Sample Size
  sample_size_target INTEGER NOT NULL,
  sample_size_actual INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  
  -- Results
  winner VARCHAR(10) CHECK (winner IN ('a', 'b', 'inconclusive')),
  confidence_level DECIMAL(5,2),
  p_value DECIMAL(10,8),
  
  -- Metadata
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_platform ON ab_tests(platform);
CREATE INDEX idx_ab_tests_dates ON ab_tests(start_date, end_date);

COMMENT ON TABLE ab_tests IS 'A/B tests for social media optimization';

-- ============================================
-- 2. TEST VARIANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS test_variants (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_letter VARCHAR(1) NOT NULL CHECK (variant_letter IN ('a', 'b')),
  
  -- Variant Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Content
  caption TEXT,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  hashtags TEXT[] DEFAULT '{}',
  cta TEXT,
  
  -- Timing
  post_time TIME,
  post_days TEXT[] DEFAULT '{}',
  
  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  
  -- Cost
  cost DECIMAL(10,2) DEFAULT 0,
  
  -- Calculated Metrics
  engagement_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 
    THEN CAST(engagement AS DECIMAL) / impressions 
    ELSE 0 END
  ) STORED,
  
  click_through_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 
    THEN CAST(clicks AS DECIMAL) / impressions 
    ELSE 0 END
  ) STORED,
  
  conversion_rate DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 
    THEN CAST(conversions AS DECIMAL) / clicks 
    ELSE 0 END
  ) STORED,
  
  cost_per_conversion DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN conversions > 0 
    THEN cost / conversions 
    ELSE 0 END
  ) STORED,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(test_id, variant_letter)
);

CREATE INDEX idx_test_variants_test ON test_variants(test_id);
CREATE INDEX idx_test_variants_performance ON test_variants(engagement_rate, click_through_rate);

COMMENT ON TABLE test_variants IS 'Individual variants (A and B) for each test';

-- ============================================
-- 3. TEST INSIGHTS TABLE (AI-Generated)
-- ============================================
CREATE TABLE IF NOT EXISTS test_insights (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  
  -- Insight Details
  insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN ('pattern', 'recommendation', 'warning', 'opportunity')),
  confidence DECIMAL(5,2) NOT NULL,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  action_items TEXT[] DEFAULT '{}',
  
  -- Metadata
  generated_by VARCHAR(100) DEFAULT 'ai',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_insights_test ON test_insights(test_id);
CREATE INDEX idx_test_insights_type ON test_insights(insight_type);

COMMENT ON TABLE test_insights IS 'AI-generated insights from test results';

-- ============================================
-- 4. LEARNING LIBRARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS test_learnings (
  id SERIAL PRIMARY KEY,
  
  -- Learning Details
  category VARCHAR(100) NOT NULL, -- 'images', 'captions', 'timing', 'ctas', 'hashtags', 'format'
  finding TEXT NOT NULL,
  impact_percentage DECIMAL(5,2), -- e.g., +42% saves
  confidence DECIMAL(5,2) NOT NULL,
  
  -- Source Tests
  test_ids INTEGER[] NOT NULL,
  sample_size_total INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_implemented BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_learnings_category ON test_learnings(category);
CREATE INDEX idx_test_learnings_active ON test_learnings(is_active);

COMMENT ON TABLE test_learnings IS 'Compiled learnings from multiple tests';

-- ============================================
-- 5. TEST PERFORMANCE LOG (Detailed Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS test_performance_log (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES test_variants(id) ON DELETE CASCADE,
  
  -- Snapshot Data
  recorded_at TIMESTAMP DEFAULT NOW(),
  impressions INTEGER NOT NULL,
  engagement INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  conversions INTEGER NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  
  -- Rates at this point in time
  engagement_rate DECIMAL(5,4),
  click_through_rate DECIMAL(5,4),
  conversion_rate DECIMAL(5,4)
);

CREATE INDEX idx_test_performance_variant ON test_performance_log(variant_id);
CREATE INDEX idx_test_performance_time ON test_performance_log(recorded_at);

COMMENT ON TABLE test_performance_log IS 'Time-series data for tracking test progress';

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Function to update test status based on sample size
CREATE OR REPLACE FUNCTION update_test_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total sample size
  UPDATE ab_tests 
  SET sample_size_actual = (
    SELECT SUM(impressions) 
    FROM test_variants 
    WHERE test_id = NEW.test_id
  )
  WHERE id = NEW.test_id;
  
  -- Auto-complete test if sample size reached
  UPDATE ab_tests
  SET status = 'completed',
      actual_end_date = NOW()
  WHERE id = NEW.test_id
    AND status = 'running'
    AND sample_size_actual >= sample_size_target;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_test_status
AFTER UPDATE OF impressions ON test_variants
FOR EACH ROW
EXECUTE FUNCTION update_test_status();

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_test_significance(test_id_param INTEGER)
RETURNS TABLE (
  winner VARCHAR(10),
  confidence_level DECIMAL(5,2),
  p_value DECIMAL(10,8)
) AS $$
DECLARE
  var_a RECORD;
  var_b RECORD;
  rate_a DECIMAL;
  rate_b DECIMAL;
  pooled DECIMAL;
  se DECIMAL;
  z_score DECIMAL;
  p_val DECIMAL;
BEGIN
  -- Get variants
  SELECT * INTO var_a FROM test_variants WHERE test_id = test_id_param AND variant_letter = 'a';
  SELECT * INTO var_b FROM test_variants WHERE test_id = test_id_param AND variant_letter = 'b';
  
  -- Calculate conversion rates
  rate_a := CASE WHEN var_a.impressions > 0 THEN CAST(var_a.conversions AS DECIMAL) / var_a.impressions ELSE 0 END;
  rate_b := CASE WHEN var_b.impressions > 0 THEN CAST(var_b.conversions AS DECIMAL) / var_b.impressions ELSE 0 END;
  
  -- Calculate pooled probability
  pooled := CAST(var_a.conversions + var_b.conversions AS DECIMAL) / NULLIF(var_a.impressions + var_b.impressions, 0);
  
  -- Calculate standard error
  se := SQRT(pooled * (1 - pooled) * (1.0/NULLIF(var_a.impressions, 0) + 1.0/NULLIF(var_b.impressions, 0)));
  
  -- Calculate z-score
  z_score := ABS(rate_a - rate_b) / NULLIF(se, 0);
  
  -- Simplified p-value calculation (approximate)
  -- In production, use proper statistical library
  p_val := 2 * (1 - (0.5 * (1 + SIGN(z_score) * SQRT(1 - EXP(-2.0 * z_score * z_score / PI())))));
  
  -- Determine winner
  IF p_val < 0.05 THEN
    IF rate_a > rate_b THEN
      winner := 'a';
    ELSE
      winner := 'b';
    END IF;
    confidence_level := (1 - p_val) * 100;
  ELSE
    winner := 'inconclusive';
    confidence_level := (1 - p_val) * 100;
  END IF;
  
  p_value := p_val;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. SEED DATA (Example Tests)
-- ============================================

-- Example test template
INSERT INTO ab_tests (
  name,
  hypothesis,
  test_type,
  variable_tested,
  platform,
  sample_size_target,
  status
) VALUES (
  'Caption Length: Short vs Long',
  'Longer captions with storytelling will drive higher engagement and conversions',
  'content',
  'caption_length',
  'instagram',
  20000,
  'draft'
) ON CONFLICT DO NOTHING;

-- ============================================
-- Migration Complete!
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'A/B Testing System Migration Complete!';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - ab_tests';
  RAISE NOTICE '  - test_variants';
  RAISE NOTICE '  - test_insights';
  RAISE NOTICE '  - test_learnings';
  RAISE NOTICE '  - test_performance_log';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - update_test_status()';
  RAISE NOTICE '  - calculate_test_significance()';
END $$;

