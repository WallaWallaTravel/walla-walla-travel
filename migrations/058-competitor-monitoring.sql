-- ============================================================================
-- Migration 058: Competitor Monitoring System
-- Description: Comprehensive competitor tracking with automated monitoring,
--              change detection, SWOT analysis, pricing history, and AI insights
-- Created: 2026-01-31
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. CLEANUP PARTIAL RUNS (drop if exists to handle partial migrations)
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS competitor_alerts CASCADE;
DROP TABLE IF EXISTS competitive_advantages CASCADE;
DROP TABLE IF EXISTS competitor_swot CASCADE;
DROP TABLE IF EXISTS competitor_snapshots CASCADE;
DROP TABLE IF EXISTS competitor_changes CASCADE;
DROP TABLE IF EXISTS competitor_pricing CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;

-- ============================================================================
-- 1. COMPETITORS (Main competitor registry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,

  -- Core Identity
  name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  description TEXT,

  -- Classification
  competitor_type VARCHAR(50) DEFAULT 'tour_operator'
    CHECK (competitor_type IN ('tour_operator', 'content_benchmark', 'indirect', 'aggregator')),
  priority_level VARCHAR(20) DEFAULT 'medium'
    CHECK (priority_level IN ('high', 'medium', 'low')),

  -- Monitoring Settings
  check_frequency VARCHAR(20) DEFAULT 'daily'
    CHECK (check_frequency IN ('every_6_hours', 'daily', 'weekly', 'monthly')),
  monitor_pricing BOOLEAN DEFAULT true,
  monitor_promotions BOOLEAN DEFAULT true,
  monitor_packages BOOLEAN DEFAULT true,
  monitor_content BOOLEAN DEFAULT true,

  -- Pages to monitor (JSONB array of URLs/paths)
  monitored_pages JSONB DEFAULT '["pricing", "tours", "homepage"]'::jsonb,

  -- Alert Configuration
  email_recipients JSONB DEFAULT '[]'::jsonb,
  alert_on_high_threat BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  logo_url VARCHAR(500),

  -- Known business details (for reference)
  pricing_model VARCHAR(100), -- e.g., "per-hour", "per-person", "flat-rate"
  min_booking VARCHAR(100),   -- e.g., "4 hours", "no minimum"
  vehicle_types TEXT[],       -- e.g., ARRAY['Sprinter', 'Tesla', 'SUV']

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_change_detected_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for competitors
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_competitors_priority ON competitors(priority_level);
CREATE INDEX IF NOT EXISTS idx_competitors_type ON competitors(competitor_type);
CREATE INDEX IF NOT EXISTS idx_competitors_last_checked ON competitors(last_checked_at DESC);

-- ============================================================================
-- 2. COMPETITOR PRICING (Current and historical pricing data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_pricing (
  id SERIAL PRIMARY KEY,
  competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Pricing Details
  pricing_type VARCHAR(50) NOT NULL
    CHECK (pricing_type IN ('base_tour', 'hourly_rate', 'per_person', 'premium_package', 'group_discount', 'promotion', 'other')),
  pricing_name VARCHAR(255) NOT NULL,

  -- Values
  price_amount DECIMAL(10,2),
  price_unit VARCHAR(50), -- 'person', 'hour', 'tour', 'vehicle'
  price_notes TEXT,

  -- For comparisons
  comparable_to_nw_touring BOOLEAN DEFAULT false,
  nw_touring_equivalent VARCHAR(255), -- e.g., 'Private Wine Tour'

  -- Status
  is_current BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,

  -- Timestamps
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for pricing
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_competitor ON competitor_pricing(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_current ON competitor_pricing(competitor_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_type ON competitor_pricing(pricing_type);
CREATE INDEX IF NOT EXISTS idx_competitor_pricing_captured ON competitor_pricing(captured_at DESC);

-- ============================================================================
-- 3. COMPETITOR SNAPSHOTS (Store baseline for change detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id SERIAL PRIMARY KEY,
  competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Page Info
  page_type VARCHAR(50) NOT NULL
    CHECK (page_type IN ('pricing', 'homepage', 'tours', 'packages', 'about', 'promotions', 'other')),
  page_url VARCHAR(2000) NOT NULL,

  -- Content
  content_hash VARCHAR(64), -- SHA-256 for quick change detection
  content_text TEXT,        -- Extracted text for AI comparison
  raw_html TEXT,            -- Original HTML (compressed if needed)

  -- Metadata
  http_status INT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(competitor_id, page_type) -- One snapshot per page type per competitor
);

-- Index for snapshots
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor ON competitor_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_captured ON competitor_snapshots(captured_at DESC);

-- ============================================================================
-- 4. COMPETITOR CHANGES (Change detection log with AI analysis)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_changes (
  id SERIAL PRIMARY KEY,
  competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- Change Details
  change_type VARCHAR(50) NOT NULL
    CHECK (change_type IN ('pricing', 'promotion', 'package', 'content', 'design', 'new_offering', 'discontinued')),
  significance VARCHAR(20) NOT NULL DEFAULT 'medium'
    CHECK (significance IN ('high', 'medium', 'low')),

  -- Description
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Before/After Values
  previous_value TEXT,
  new_value TEXT,

  -- AI Analysis
  threat_level VARCHAR(20)
    CHECK (threat_level IS NULL OR threat_level IN ('high', 'medium', 'low', 'none', 'opportunity')),
  ai_analysis TEXT,
  recommended_actions JSONB DEFAULT '[]'::jsonb, -- Array of action strings
  strategic_implications TEXT,

  -- Review Workflow
  status VARCHAR(20) DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'actioned', 'dismissed', 'archived')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  action_taken TEXT,
  action_taken_at TIMESTAMPTZ,

  -- Source
  source_url VARCHAR(2000),
  detected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for changes
CREATE INDEX IF NOT EXISTS idx_competitor_changes_competitor ON competitor_changes(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_changes_status ON competitor_changes(status);
CREATE INDEX IF NOT EXISTS idx_competitor_changes_new ON competitor_changes(status, detected_at DESC) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_competitor_changes_threat ON competitor_changes(threat_level) WHERE threat_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_competitor_changes_type ON competitor_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_competitor_changes_detected ON competitor_changes(detected_at DESC);

-- ============================================================================
-- 5. COMPETITOR SWOT (SWOT analysis per competitor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_swot (
  id SERIAL PRIMARY KEY,
  competitor_id INT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,

  -- SWOT Category
  category VARCHAR(20) NOT NULL
    CHECK (category IN ('strength', 'weakness', 'opportunity', 'threat')),

  -- Item Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  impact_level VARCHAR(20) DEFAULT 'medium'
    CHECK (impact_level IN ('high', 'medium', 'low')),

  -- Status
  is_active BOOLEAN DEFAULT true,
  verified_at TIMESTAMPTZ,
  source TEXT, -- Where this insight came from

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for SWOT
CREATE INDEX IF NOT EXISTS idx_competitor_swot_competitor ON competitor_swot(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_swot_category ON competitor_swot(competitor_id, category);
CREATE INDEX IF NOT EXISTS idx_competitor_swot_active ON competitor_swot(competitor_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 6. COMPETITIVE ADVANTAGES (Our differentiators)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitive_advantages (
  id SERIAL PRIMARY KEY,

  -- Advantage Details
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Categorization
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('service', 'pricing', 'experience', 'technology', 'expertise', 'location', 'vehicle', 'partnership', 'other')),

  -- Impact
  importance VARCHAR(20) DEFAULT 'high'
    CHECK (importance IN ('critical', 'high', 'medium', 'low')),

  -- Evidence
  supporting_evidence TEXT,
  customer_testimonial TEXT,

  -- Competitors this advantage applies against
  applies_to_competitors INT[] DEFAULT ARRAY[]::INT[], -- Array of competitor IDs

  -- Communication
  marketing_message TEXT, -- How to communicate this advantage
  use_in_proposals BOOLEAN DEFAULT true,
  use_on_website BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for advantages
CREATE INDEX IF NOT EXISTS idx_competitive_advantages_category ON competitive_advantages(category);
CREATE INDEX IF NOT EXISTS idx_competitive_advantages_active ON competitive_advantages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_competitive_advantages_importance ON competitive_advantages(importance);

-- ============================================================================
-- 7. COMPETITOR ALERTS (Alert history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS competitor_alerts (
  id SERIAL PRIMARY KEY,

  -- Alert Details
  alert_type VARCHAR(50) NOT NULL
    CHECK (alert_type IN ('change_detected', 'high_threat', 'price_drop', 'new_promotion', 'weekly_digest', 'manual')),

  -- Related Records
  competitor_id INT REFERENCES competitors(id) ON DELETE SET NULL,
  change_id INT REFERENCES competitor_changes(id) ON DELETE SET NULL,

  -- Content
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  -- Delivery
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of email addresses
  sent_at TIMESTAMPTZ,
  delivery_status VARCHAR(20) DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced')),
  delivery_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_competitor ON competitor_alerts(competitor_id) WHERE competitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_status ON competitor_alerts(delivery_status);
CREATE INDEX IF NOT EXISTS idx_competitor_alerts_sent ON competitor_alerts(sent_at DESC) WHERE sent_at IS NOT NULL;

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_competitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
DROP TRIGGER IF EXISTS trg_competitors_updated ON competitors;
CREATE TRIGGER trg_competitors_updated
  BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

DROP TRIGGER IF EXISTS trg_competitor_pricing_updated ON competitor_pricing;
CREATE TRIGGER trg_competitor_pricing_updated
  BEFORE UPDATE ON competitor_pricing
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

DROP TRIGGER IF EXISTS trg_competitor_changes_updated ON competitor_changes;
CREATE TRIGGER trg_competitor_changes_updated
  BEFORE UPDATE ON competitor_changes
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

DROP TRIGGER IF EXISTS trg_competitor_swot_updated ON competitor_swot;
CREATE TRIGGER trg_competitor_swot_updated
  BEFORE UPDATE ON competitor_swot
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

DROP TRIGGER IF EXISTS trg_competitive_advantages_updated ON competitive_advantages;
CREATE TRIGGER trg_competitive_advantages_updated
  BEFORE UPDATE ON competitive_advantages
  FOR EACH ROW EXECUTE FUNCTION update_competitors_updated_at();

-- Function to update competitor's last_change_detected_at when a change is created
CREATE OR REPLACE FUNCTION update_competitor_last_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE competitors
  SET last_change_detected_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.competitor_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_competitor_change_detected ON competitor_changes;
CREATE TRIGGER trg_competitor_change_detected
  AFTER INSERT ON competitor_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_last_change();

-- ============================================================================
-- 9. SEED DATA - Real Walla Walla Wine Tour Competitors
-- ============================================================================

-- Insert competitors (idempotent using ON CONFLICT)
INSERT INTO competitors (name, website_url, description, competitor_type, priority_level, pricing_model, min_booking, vehicle_types, check_frequency)
VALUES
  -- HIGH PRIORITY - Direct Competitors
  ('Black Tie Wine Tours', 'https://blacktiewinetours.com', '20+ years in Walla Walla, 3 vehicle options, professional chauffeur service', 'tour_operator', 'high', 'per-hour', '4 hours', ARRAY['Sedan', 'SUV', 'Sprinter'], 'daily'),
  ('d''Vine Wine Tour', 'https://dvinewinetour.com', '#1 TripAdvisor ranked, 11-passenger van, per-person pricing model', 'tour_operator', 'high', 'per-person', 'none', ARRAY['11-pass Van'], 'daily'),
  ('Tesla Winery Tours', 'https://teslawinerytours.com', '"Best Tour" award winner, premium Tesla vehicles, eco-friendly positioning', 'tour_operator', 'high', 'per-hour', '5 hours', ARRAY['Tesla Model X', 'Tesla Model S'], 'daily'),

  -- MEDIUM PRIORITY - Established Competitors
  ('The Touring Company', 'https://thetouringco.net', 'Offers both Sprinter and BMW, private and group options', 'tour_operator', 'medium', 'hybrid', '4 hours', ARRAY['Sprinter', 'BMW'], 'daily'),
  ('Winery Tours Walla Walla', 'https://winerytourswallawalla.com', 'Since 2008, 5-hour private tours, flat-rate pricing', 'tour_operator', 'medium', 'flat-rate', '5 hours', ARRAY['SUV', 'Van'], 'weekly'),
  ('Bacchus & Barley', 'https://bacchusandbarleyww.com', '11-passenger Sprinter, unique dog-friendly option', 'tour_operator', 'medium', 'per-hour', '4 hours', ARRAY['Sprinter'], 'weekly'),

  -- LOW PRIORITY - Smaller/Niche Competitors
  ('Walla Walla Wine Limo', 'https://wallawallawinelimo.com', 'Traditional limo service with multiple vehicle types', 'tour_operator', 'low', 'per-hour', '3 hours', ARRAY['Limo', 'SUV', 'Sedan'], 'weekly'),
  ('Cameo Heights Mansion', 'https://cameoheightsmansion.com', 'Different model - lodging with bundled tour packages', 'indirect', 'low', 'bundled', 'with stay', ARRAY['Partner vehicles'], 'monthly'),

  -- CONTENT BENCHMARK
  ('Visit Walla Walla', 'https://visitwallawalla.com', 'Official tourism site - benchmark for content quality and SEO authority', 'content_benchmark', 'high', NULL, NULL, NULL, 'weekly')
ON CONFLICT DO NOTHING;

-- Insert known pricing data for high-priority competitors
INSERT INTO competitor_pricing (competitor_id, pricing_type, pricing_name, price_amount, price_unit, price_notes, comparable_to_nw_touring, nw_touring_equivalent)
SELECT c.id, p.pricing_type, p.pricing_name, p.price_amount, p.price_unit, p.price_notes, p.comparable_to_nw_touring, p.nw_touring_equivalent
FROM competitors c
CROSS JOIN (VALUES
  -- Black Tie Wine Tours
  ('Black Tie Wine Tours', 'hourly_rate', 'Sedan/SUV (1-3 guests)', 90.00, 'hour', '+20% fuel/gratuity, 4hr minimum', true, 'Private Wine Tour'),
  ('Black Tie Wine Tours', 'hourly_rate', 'Lincoln Navigator (4-6 guests)', 100.00, 'hour', '+20% fuel/gratuity, 4hr minimum', true, 'Private Wine Tour'),
  ('Black Tie Wine Tours', 'hourly_rate', 'Mercedes Sprinter (7-14 guests)', 120.00, 'hour', '+20% fuel/gratuity, 4hr minimum', true, 'Group Tour'),

  -- d'Vine Wine Tour
  ('d''Vine Wine Tour', 'per_person', 'Full Day Tour (1-3 guests)', 119.00, 'person', 'Includes 4 winery stops', true, 'Private Wine Tour'),
  ('d''Vine Wine Tour', 'per_person', 'Full Day Tour (4+ guests)', 99.00, 'person', 'Includes 4 winery stops', true, 'Group Tour'),

  -- Tesla Winery Tours
  ('Tesla Winery Tours', 'hourly_rate', 'Tesla Model X/S (1-4 guests)', 109.00, 'hour', '5hr minimum', true, 'Private Wine Tour'),
  ('Tesla Winery Tours', 'hourly_rate', 'Tesla Model X/S (extended)', 130.00, 'hour', 'Peak season rate', true, 'Private Wine Tour'),

  -- The Touring Company
  ('The Touring Company', 'hourly_rate', 'BMW 7 Series', 99.00, 'hour', '4hr minimum', true, 'Private Wine Tour'),
  ('The Touring Company', 'per_person', 'Shared Sprinter Tour', 155.00, 'person', 'Public tour option', false, NULL),

  -- Winery Tours Walla Walla
  ('Winery Tours Walla Walla', 'base_tour', 'Private 5-Hour Tour (2-4 guests)', 375.00, 'tour', 'Flat rate for small groups', true, 'Private Wine Tour'),
  ('Winery Tours Walla Walla', 'base_tour', 'Private 5-Hour Tour (5-10 guests)', 425.00, 'tour', 'Flat rate for larger groups', true, 'Group Tour')
) AS p(competitor_name, pricing_type, pricing_name, price_amount, price_unit, price_notes, comparable_to_nw_touring, nw_touring_equivalent)
WHERE c.name = p.competitor_name
ON CONFLICT DO NOTHING;

-- Insert initial SWOT items for key competitors
INSERT INTO competitor_swot (competitor_id, category, title, description, impact_level, source)
SELECT c.id, s.category, s.title, s.description, s.impact_level, s.source
FROM competitors c
CROSS JOIN (VALUES
  -- Black Tie Wine Tours
  ('Black Tie Wine Tours', 'strength', 'Long-established reputation', '20+ years in market provides strong brand recognition', 'high', 'Website research'),
  ('Black Tie Wine Tours', 'strength', 'Vehicle variety', 'Multiple vehicle options for different group sizes', 'medium', 'Website research'),
  ('Black Tie Wine Tours', 'weakness', 'Complex pricing', 'Additional 20% for fuel/gratuity makes total cost unclear', 'medium', 'Website research'),
  ('Black Tie Wine Tours', 'threat', 'Price competition', 'Hourly rates competitive with our pricing', 'medium', 'Pricing analysis'),

  -- d'Vine Wine Tour
  ('d''Vine Wine Tour', 'strength', '#1 TripAdvisor ranking', 'Strong social proof and review presence', 'high', 'TripAdvisor'),
  ('d''Vine Wine Tour', 'strength', 'Simple per-person pricing', 'Easy to understand pricing model', 'medium', 'Website research'),
  ('d''Vine Wine Tour', 'weakness', 'Single vehicle type', 'Only 11-passenger van limits flexibility', 'low', 'Website research'),
  ('d''Vine Wine Tour', 'opportunity', 'Differentiate on luxury', 'Their focus on value leaves room for premium positioning', 'high', 'Market analysis'),

  -- Tesla Winery Tours
  ('Tesla Winery Tours', 'strength', 'Unique eco-positioning', 'Tesla vehicles attract environmentally-conscious customers', 'medium', 'Website research'),
  ('Tesla Winery Tours', 'strength', '"Best Tour" award', 'Award recognition provides credibility', 'medium', 'Website research'),
  ('Tesla Winery Tours', 'weakness', 'Higher minimums', '5-hour minimum is higher than most competitors', 'medium', 'Website research'),
  ('Tesla Winery Tours', 'weakness', 'Limited capacity', 'Tesla vehicles have smaller passenger capacity', 'medium', 'Vehicle specs')
) AS s(competitor_name, category, title, description, impact_level, source)
WHERE c.name = s.competitor_name
ON CONFLICT DO NOTHING;

-- Insert our competitive advantages
INSERT INTO competitive_advantages (title, description, category, importance, supporting_evidence, marketing_message, use_in_proposals, use_on_website)
VALUES
  ('Local ownership and expertise', 'Owner lives in Walla Walla and has deep relationships with local wineries', 'expertise', 'critical', 'Owner can arrange special tastings and behind-the-scenes access', 'Experience Walla Walla through the eyes of a true local', true, true),
  ('Transparent all-inclusive pricing', 'No hidden fees - price includes everything (vs competitors adding 20% fuel/gratuity)', 'pricing', 'high', 'Black Tie adds 20% to base rate; our pricing is what you pay', 'What you see is what you pay - no surprises', true, true),
  ('Premium vehicle quality', 'Late-model luxury vehicles maintained to highest standards', 'vehicle', 'high', 'Regular vehicle inspections, always clean and detailed', 'Travel in style with our premium fleet', true, true),
  ('Flexible customization', 'Tours fully customized to guest preferences, dietary needs, interests', 'service', 'high', 'Pre-tour questionnaire, real-time itinerary adjustments', 'Your tour, your way - we build around your preferences', true, true),
  ('Winery relationships', 'Established partnerships with 50+ wineries for priority tastings', 'partnership', 'high', 'Can secure reservations at popular wineries that book out', 'Access wineries that others can''t', true, true),
  ('Multi-day experience expertise', 'Specialists in creating multi-day wine country experiences', 'experience', 'medium', 'Curated hotel, dining, and activity recommendations', 'Let us plan your entire Walla Walla adventure', true, true),
  ('FMCSA-compliant operations', 'Full DOT compliance (USDOT 3603851) - properly licensed and insured', 'service', 'critical', 'Active authority, proper insurance coverage, maintained DQ files', 'Travel with peace of mind - fully licensed and insured', false, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE competitors IS 'Registry of competitors and content benchmarks for monitoring';
COMMENT ON TABLE competitor_pricing IS 'Current and historical pricing data for competitors';
COMMENT ON TABLE competitor_snapshots IS 'Baseline website snapshots for AI change detection';
COMMENT ON TABLE competitor_changes IS 'Detected changes with AI analysis and recommendations';
COMMENT ON TABLE competitor_swot IS 'SWOT analysis items for each competitor';
COMMENT ON TABLE competitive_advantages IS 'Our competitive advantages and differentiators';
COMMENT ON TABLE competitor_alerts IS 'Alert delivery history for competitor changes';

COMMIT;
