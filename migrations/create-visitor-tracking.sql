-- Visitor Tracking & Persistence
-- Allows anonymous visitor tracking with optional email capture

-- Visitors table (tracks anonymous and identified visitors)
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  visitor_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  phone VARCHAR(50),
  
  -- Tracking
  first_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count INTEGER NOT NULL DEFAULT 1,
  total_queries INTEGER NOT NULL DEFAULT 0,
  
  -- Attribution
  referral_source VARCHAR(255),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  landing_page TEXT,
  
  -- Device info (for cross-device tracking)
  user_agent TEXT,
  device_type VARCHAR(50), -- mobile, tablet, desktop
  browser VARCHAR(50),
  os VARCHAR(50),
  
  -- Conversion tracking
  converted_to_booking BOOLEAN DEFAULT FALSE,
  first_booking_id INTEGER REFERENCES bookings(id),
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  
  -- Preferences (stored as JSONB)
  preferences JSONB DEFAULT '{}',
  
  -- Privacy
  gdpr_consent BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_visitors_uuid ON visitors(visitor_uuid);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON visitors(last_visit_at);

-- Update ai_queries to link to visitors
ALTER TABLE ai_queries 
ADD COLUMN IF NOT EXISTS visitor_id INTEGER REFERENCES visitors(id);

CREATE INDEX IF NOT EXISTS idx_ai_queries_visitor_id ON ai_queries(visitor_id);

-- Update session tracking
UPDATE ai_queries 
SET visitor_id = (
  SELECT id FROM visitors 
  WHERE visitor_uuid::text = ai_queries.session_id
  LIMIT 1
)
WHERE visitor_id IS NULL AND session_id IS NOT NULL;

-- Visitor sessions table (track individual sessions)
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER NOT NULL REFERENCES visitors(id),
  session_uuid UUID UNIQUE NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  pages_viewed INTEGER DEFAULT 0,
  queries_count INTEGER DEFAULT 0,
  
  device_type VARCHAR(50),
  user_agent TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_id ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_uuid ON visitor_sessions(session_uuid);

-- Function to update visitor last_visit
CREATE OR REPLACE FUNCTION update_visitor_last_visit()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_visit_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_visit
CREATE TRIGGER trigger_update_visitor_last_visit
  BEFORE UPDATE ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_last_visit();

-- Email capture tracking (progressive capture moments)
CREATE TABLE IF NOT EXISTS email_capture_attempts (
  id SERIAL PRIMARY KEY,
  visitor_id INTEGER NOT NULL REFERENCES visitors(id),
  
  trigger_type VARCHAR(100) NOT NULL, -- after_queries, before_booking, save_recommendations, etc.
  query_count_at_prompt INTEGER,
  
  prompted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured BOOLEAN DEFAULT FALSE,
  email VARCHAR(255),
  captured_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_capture_visitor_id ON email_capture_attempts(visitor_id);

COMMENT ON TABLE visitors IS 'Tracks all visitors (anonymous and identified) with attribution and conversion data';
COMMENT ON TABLE visitor_sessions IS 'Individual browsing sessions for each visitor';
COMMENT ON TABLE email_capture_attempts IS 'Tracks progressive email capture prompts and success rates';

