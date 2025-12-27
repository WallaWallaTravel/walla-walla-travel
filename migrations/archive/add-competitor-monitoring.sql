-- Migration: Add Competitor Monitoring System
-- Date: November 1, 2025
-- Purpose: Monitor competitor websites for pricing, promotions, and content changes

-- ============================================
-- 1. COMPETITORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  
  -- Monitoring Settings
  monitor_pricing BOOLEAN DEFAULT TRUE,
  monitor_promotions BOOLEAN DEFAULT TRUE,
  monitor_packages BOOLEAN DEFAULT TRUE,
  monitor_content BOOLEAN DEFAULT TRUE,
  monitor_design BOOLEAN DEFAULT FALSE,
  
  -- Check Frequency
  check_frequency VARCHAR(50) DEFAULT 'every_6_hours' CHECK (
    check_frequency IN ('every_hour', 'every_6_hours', 'daily', 'weekly')
  ),
  last_checked_at TIMESTAMP,
  next_check_at TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  priority_level VARCHAR(50) DEFAULT 'medium' CHECK (
    priority_level IN ('high', 'medium', 'low')
  ),
  
  -- Notification Settings
  notify_popup BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  email_recipients TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_competitors_active ON competitors(is_active);
CREATE INDEX idx_competitors_next_check ON competitors(next_check_at) WHERE is_active = TRUE;

COMMENT ON TABLE competitors IS 'Competitor websites to monitor';

-- ============================================
-- 2. COMPETITOR SNAPSHOTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_snapshots (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  
  -- Snapshot Data
  snapshot_date TIMESTAMP DEFAULT NOW(),
  page_content TEXT,
  page_html TEXT,
  
  -- Structured Data
  pricing_data JSONB DEFAULT '{}',
  promotions_data JSONB DEFAULT '{}',
  packages_data JSONB DEFAULT '{}',
  meta_data JSONB DEFAULT '{}',
  
  -- Change Detection
  content_hash VARCHAR(64) NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_snapshots_competitor ON competitor_snapshots(competitor_id);
CREATE INDEX idx_snapshots_date ON competitor_snapshots(snapshot_date);
CREATE INDEX idx_snapshots_hash ON competitor_snapshots(content_hash);

COMMENT ON TABLE competitor_snapshots IS 'Historical snapshots of competitor websites';

-- ============================================
-- 3. COMPETITOR CHANGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_changes (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_id INTEGER REFERENCES competitor_snapshots(id),
  
  -- Change Details
  change_type VARCHAR(50) NOT NULL CHECK (
    change_type IN ('pricing', 'promotion', 'package', 'content', 'design')
  ),
  significance VARCHAR(50) NOT NULL CHECK (
    significance IN ('high', 'medium', 'low')
  ),
  description TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  
  -- AI Analysis
  ai_analysis JSONB DEFAULT '{}',
  threat_level VARCHAR(50) CHECK (
    threat_level IN ('high', 'medium', 'low', 'none')
  ),
  recommended_actions TEXT[] DEFAULT '{}',
  competitive_advantage TEXT,
  pricing_comparison TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'new' CHECK (
    status IN ('new', 'reviewed', 'actioned', 'dismissed')
  ),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  notes TEXT,
  
  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_changes_competitor ON competitor_changes(competitor_id);
CREATE INDEX idx_changes_status ON competitor_changes(status);
CREATE INDEX idx_changes_significance ON competitor_changes(significance);
CREATE INDEX idx_changes_detected ON competitor_changes(detected_at);

COMMENT ON TABLE competitor_changes IS 'Detected changes on competitor websites';

-- ============================================
-- 4. ANALYTICS CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_config (
  id SERIAL PRIMARY KEY,
  
  -- Google Analytics 4
  ga_property_id VARCHAR(255),
  ga_measurement_id VARCHAR(255),
  ga_api_secret VARCHAR(255),
  ga_enabled BOOLEAN DEFAULT FALSE,
  
  -- Facebook Pixel
  fb_pixel_id VARCHAR(255),
  fb_access_token VARCHAR(500),
  fb_enabled BOOLEAN DEFAULT FALSE,
  
  -- LinkedIn Insight Tag
  li_partner_id VARCHAR(255),
  li_enabled BOOLEAN DEFAULT FALSE,
  
  -- TikTok Pixel
  tt_pixel_id VARCHAR(255),
  tt_enabled BOOLEAN DEFAULT FALSE,
  
  -- Custom Event Tracking
  track_booking_started BOOLEAN DEFAULT TRUE,
  track_booking_completed BOOLEAN DEFAULT TRUE,
  track_proposal_viewed BOOLEAN DEFAULT TRUE,
  track_proposal_accepted BOOLEAN DEFAULT TRUE,
  track_email_clicked BOOLEAN DEFAULT TRUE,
  track_phone_clicked BOOLEAN DEFAULT TRUE,
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default config
INSERT INTO analytics_config (id) VALUES (1) ON CONFLICT DO NOTHING;

COMMENT ON TABLE analytics_config IS 'Analytics and tracking configuration';

-- ============================================
-- 5. ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  
  -- Event Details
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(100),
  event_label VARCHAR(255),
  event_value DECIMAL(10,2),
  
  -- User Info
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  
  -- Source Info
  source VARCHAR(100),
  medium VARCHAR(100),
  campaign VARCHAR(255),
  referrer TEXT,
  
  -- Page Info
  page_url TEXT,
  page_title VARCHAR(255),
  
  -- Device Info
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  
  -- Location
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Metadata
  custom_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_name ON analytics_events(event_name);
CREATE INDEX idx_events_date ON analytics_events(created_at);
CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_session ON analytics_events(session_id);

COMMENT ON TABLE analytics_events IS 'Custom analytics events tracking';

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Function to schedule next check
CREATE OR REPLACE FUNCTION schedule_next_check()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_check_at := CASE NEW.check_frequency
    WHEN 'every_hour' THEN NOW() + INTERVAL '1 hour'
    WHEN 'every_6_hours' THEN NOW() + INTERVAL '6 hours'
    WHEN 'daily' THEN NOW() + INTERVAL '1 day'
    WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
    ELSE NOW() + INTERVAL '6 hours'
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_schedule_next_check
BEFORE INSERT OR UPDATE OF check_frequency, last_checked_at ON competitors
FOR EACH ROW
EXECUTE FUNCTION schedule_next_check();

-- Function to get unreviewed changes count
CREATE OR REPLACE FUNCTION get_unreviewed_changes_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM competitor_changes WHERE status = 'new');
END;
$$ LANGUAGE plpgsql;

-- Function to get competitor summary
CREATE OR REPLACE FUNCTION get_competitor_summary(competitor_id_param INTEGER)
RETURNS TABLE (
  total_changes INTEGER,
  high_priority_changes INTEGER,
  last_change_date TIMESTAMP,
  avg_threat_level VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_changes,
    COUNT(*) FILTER (WHERE significance = 'high')::INTEGER as high_priority_changes,
    MAX(detected_at) as last_change_date,
    MODE() WITHIN GROUP (ORDER BY threat_level) as avg_threat_level
  FROM competitor_changes
  WHERE competitor_id = competitor_id_param
    AND detected_at > NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VIEWS
-- ============================================

-- View for active monitoring queue
CREATE OR REPLACE VIEW monitoring_queue AS
SELECT 
  c.id,
  c.name,
  c.website_url,
  c.priority_level,
  c.next_check_at,
  c.last_checked_at,
  COUNT(cc.id) FILTER (WHERE cc.status = 'new') as pending_changes
FROM competitors c
LEFT JOIN competitor_changes cc ON c.id = cc.competitor_id
WHERE c.is_active = TRUE
  AND c.next_check_at <= NOW()
GROUP BY c.id
ORDER BY 
  CASE c.priority_level 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END,
  c.next_check_at ASC;

COMMENT ON VIEW monitoring_queue IS 'Competitors due for checking';

-- View for recent changes dashboard
CREATE OR REPLACE VIEW recent_changes_dashboard AS
SELECT 
  cc.id,
  c.name as competitor_name,
  c.website_url,
  cc.change_type,
  cc.significance,
  cc.description,
  cc.threat_level,
  cc.status,
  cc.detected_at,
  cc.reviewed_at,
  cc.reviewed_by
FROM competitor_changes cc
JOIN competitors c ON cc.competitor_id = c.id
WHERE cc.detected_at > NOW() - INTERVAL '7 days'
ORDER BY 
  CASE cc.significance 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END,
  cc.detected_at DESC;

COMMENT ON VIEW recent_changes_dashboard IS 'Recent competitor changes for dashboard';

-- ============================================
-- Migration Complete!
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Competitor Monitoring System Migration Complete!';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - competitors';
  RAISE NOTICE '  - competitor_snapshots';
  RAISE NOTICE '  - competitor_changes';
  RAISE NOTICE '  - analytics_config';
  RAISE NOTICE '  - analytics_events';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - schedule_next_check()';
  RAISE NOTICE '  - get_unreviewed_changes_count()';
  RAISE NOTICE '  - get_competitor_summary()';
  RAISE NOTICE 'Views created:';
  RAISE NOTICE '  - monitoring_queue';
  RAISE NOTICE '  - recent_changes_dashboard';
END $$;

