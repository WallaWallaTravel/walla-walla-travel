-- Knowledge Base Tables for AI Assistant
-- Version 1.0 - Phase 1 Implementation

-- ============================================================================
-- SECTION 1: Core Knowledge Base Tables
-- ============================================================================

-- Businesses (content sources)
CREATE TABLE IF NOT EXISTS kb_businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- winery, restaurant, hotel, attraction, expert
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_businesses_type ON kb_businesses(type);
CREATE INDEX IF NOT EXISTS idx_kb_businesses_verified ON kb_businesses(verified);

-- Content contributions
CREATE TABLE IF NOT EXISTS kb_contributions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id) ON DELETE SET NULL,
  contributor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Content identification
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- text, document, voice, video, image, url
  original_filename VARCHAR(255),
  content_text TEXT, -- For text content or transcriptions
  
  -- Processing status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, in_review, approved, indexed, failed, rejected
  file_search_doc_id VARCHAR(255), -- Gemini File Search document ID
  
  -- Metadata
  topics TEXT[], -- Array of topic tags
  audience_type VARCHAR(50),
  is_evergreen BOOLEAN DEFAULT TRUE,
  valid_from DATE,
  valid_until DATE,
  
  -- AI Pre-screening
  ai_prescreening JSONB, -- Stores AI analysis: recommendation, confidence, flags
  
  -- Review fields
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  indexed_at TIMESTAMP,
  last_retrieved_at TIMESTAMP,
  retrieval_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kb_contributions_business ON kb_contributions(business_id);
CREATE INDEX IF NOT EXISTS idx_kb_contributions_status ON kb_contributions(status);
CREATE INDEX IF NOT EXISTS idx_kb_contributions_type ON kb_contributions(content_type);

-- Trusted contributors table
CREATE TABLE IF NOT EXISTS kb_trusted_contributors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  business_id INTEGER REFERENCES kb_businesses(id),
  trust_level VARCHAR(20) DEFAULT 'standard', -- standard, trusted, super
  auto_approve_types TEXT[], -- content types that skip review
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  last_rejection_at TIMESTAMP,
  promoted_at TIMESTAMP,
  promoted_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_trusted_user ON kb_trusted_contributors(user_id);

-- Review history for audit trail
CREATE TABLE IF NOT EXISTS kb_review_history (
  id SERIAL PRIMARY KEY,
  contribution_id INTEGER REFERENCES kb_contributions(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- approved, rejected, requested_info, edited
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_review_contribution ON kb_review_history(contribution_id);

-- ============================================================================
-- SECTION 2: Chat & Session Tables
-- ============================================================================

-- Chat sessions
CREATE TABLE IF NOT EXISTS kb_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255), -- Anonymous or authenticated
  
  -- Gathered preferences
  visitor_profile JSONB,
  
  -- Session data
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  
  -- Generated itineraries
  itinerary_generated BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_kb_chat_sessions_visitor ON kb_chat_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_kb_chat_sessions_started ON kb_chat_sessions(started_at);

-- Chat messages
CREATE TABLE IF NOT EXISTS kb_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES kb_chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  
  -- Grounding metadata
  sources_used TEXT[], -- Business names cited
  grounding_metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_chat_messages_session ON kb_chat_messages(session_id);

-- Generated itineraries
CREATE TABLE IF NOT EXISTS kb_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id) ON DELETE CASCADE,
  
  -- Itinerary data
  trip_start DATE NOT NULL,
  trip_end DATE NOT NULL,
  itinerary_data JSONB NOT NULL,
  
  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exported_at TIMESTAMP,
  export_format VARCHAR(20) -- pdf, email
);

CREATE INDEX IF NOT EXISTS idx_kb_itineraries_session ON kb_itineraries(session_id);

-- ============================================================================
-- SECTION 3: Booking Bridge Tables
-- ============================================================================

-- Trip state persistence (for incremental building)
CREATE TABLE IF NOT EXISTS kb_trip_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES kb_chat_sessions(id) UNIQUE ON DELETE CASCADE,
  
  -- Dates
  dates_status VARCHAR(20) DEFAULT 'flexible',
  start_date DATE,
  end_date DATE,
  date_flexibility TEXT,
  
  -- Party
  party_size INTEGER,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Selections (the "basket")
  selections JSONB DEFAULT '[]',
  
  -- Learned preferences
  preferences JSONB DEFAULT '{}',
  
  -- Readiness flags
  ready_for_itinerary BOOLEAN DEFAULT FALSE,
  ready_for_deposit BOOLEAN DEFAULT FALSE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_trip_states_session ON kb_trip_states(session_id);

-- Draft bookings from AI chat
CREATE TABLE IF NOT EXISTS kb_draft_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source
  chat_session_id UUID REFERENCES kb_chat_sessions(id),
  itinerary_id UUID REFERENCES kb_itineraries(id),
  
  -- Customer
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Trip details
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  party_size INTEGER NOT NULL,
  party_type VARCHAR(50),
  special_occasion VARCHAR(255),
  
  -- Itinerary
  itinerary_summary JSONB, -- wineries, restaurants, activities
  preferences JSONB, -- wine types, pace, restrictions
  special_requests TEXT,
  
  -- QUOTED costs (tour services only - shown to customer)
  cost_transportation DECIMAL(10,2),
  cost_guide DECIMAL(10,2),
  cost_activities DECIMAL(10,2),
  cost_tour_total DECIMAL(10,2) NOT NULL, -- Base for deposit calculation
  
  -- TBD costs (internal reference only - NOT shown in quotes)
  tbd_tastings_estimate DECIMAL(10,2), -- For planning reference
  tbd_dining_estimate DECIMAL(10,2), -- For planning reference
  tbd_winery_count INTEGER, -- Number of wineries planned
  
  -- Deposit (50% of tour total, excludes tasting & dining)
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  deposit_base_amount DECIMAL(10,2) NOT NULL, -- = cost_tour_total
  deposit_amount DECIMAL(10,2) NOT NULL, -- = base * percentage
  stripe_payment_intent_id VARCHAR(255),
  deposit_paid_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, deposit_pending, deposit_paid, confirmed, cancelled, refunded
  
  -- Admin workflow
  assigned_to INTEGER REFERENCES users(id),
  admin_notes TEXT,
  converted_booking_id INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_draft_bookings_status ON kb_draft_bookings(status);
CREATE INDEX IF NOT EXISTS idx_kb_draft_bookings_email ON kb_draft_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_kb_draft_bookings_session ON kb_draft_bookings(chat_session_id);

-- ============================================================================
-- SECTION 4: Pricing Configuration
-- ============================================================================

-- Pricing configuration (admin-managed)
CREATE TABLE IF NOT EXISTS kb_pricing_config (
  id SERIAL PRIMARY KEY,
  
  -- Vehicle rates (per day) - INCLUDED in quotes
  rate_sedan DECIMAL(10,2) DEFAULT 350.00, -- 1-2 guests
  rate_suv DECIMAL(10,2) DEFAULT 400.00, -- 3-4 guests
  rate_van DECIMAL(10,2) DEFAULT 500.00, -- 5-8 guests
  rate_sprinter DECIMAL(10,2) DEFAULT 650.00, -- 9-14 guests
  
  -- Guide rate - INCLUDED in quotes
  rate_guide_per_day DECIMAL(10,2) DEFAULT 300.00,
  
  -- Tasting fee defaults (for internal estimates only, NOT in quotes)
  default_tasting_fee DECIMAL(10,2) DEFAULT 25.00,
  tasting_fee_note VARCHAR(255) DEFAULT 'Typically $20-50 per person, often waived with purchase',
  
  -- Average meal costs (for internal estimates only, NOT in quotes)
  avg_breakfast DECIMAL(10,2) DEFAULT 20.00,
  avg_lunch DECIMAL(10,2) DEFAULT 35.00,
  avg_dinner DECIMAL(10,2) DEFAULT 75.00,
  
  -- Deposit settings
  deposit_percentage DECIMAL(5,2) DEFAULT 0.50,
  
  -- Active flag (only one active config)
  is_active BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Business-specific pricing (internal reference)
CREATE TABLE IF NOT EXISTS kb_business_pricing (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES kb_businesses(id) ON DELETE CASCADE,
  
  -- For internal estimates only
  tasting_fee_per_person DECIMAL(10,2),
  tasting_waiver_policy VARCHAR(255), -- e.g., "Waived with 2+ bottle purchase"
  activity_cost_total DECIMAL(10,2), -- For activities
  
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kb_business_pricing_business ON kb_business_pricing(business_id);

-- ============================================================================
-- SECTION 5: Analytics Tables
-- ============================================================================

-- Visitor sessions
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id VARCHAR(255) NOT NULL, -- Anonymous persistent ID
  
  -- Entry context
  entry_url TEXT NOT NULL,
  entry_path VARCHAR(255),
  referrer TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  
  -- Device
  device_type VARCHAR(20), -- mobile, tablet, desktop
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_size VARCHAR(20),
  
  -- Location (approximate)
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Session metrics
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  active_time_seconds INTEGER,
  
  -- Engagement flags
  opened_chat BOOLEAN DEFAULT FALSE,
  sent_chat_message BOOLEAN DEFAULT FALSE,
  viewed_itinerary BOOLEAN DEFAULT FALSE,
  started_booking BOOLEAN DEFAULT FALSE,
  completed_deposit BOOLEAN DEFAULT FALSE,
  
  -- Conversion tracking
  converted_to_booking BOOLEAN DEFAULT FALSE,
  booking_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started ON analytics_sessions(started_at);

-- Individual events
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255) NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100), -- For custom events
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Page context
  page_url TEXT,
  page_path VARCHAR(255),
  page_section VARCHAR(50),
  
  -- Event-specific data
  properties JSONB,
  
  -- Element info (for interactions)
  element_type VARCHAR(50),
  element_id VARCHAR(100),
  element_text VARCHAR(255),
  target_url TEXT,
  
  -- Metrics
  scroll_depth INTEGER,
  time_on_page INTEGER,
  active_time INTEGER
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

-- Page performance (aggregated)
CREATE TABLE IF NOT EXISTS analytics_page_stats (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  
  -- Traffic
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  
  -- Engagement
  avg_time_on_page INTEGER, -- seconds
  avg_scroll_depth INTEGER, -- percentage
  bounce_rate DECIMAL(5,2), -- percentage
  
  -- Exits
  exit_count INTEGER DEFAULT 0,
  exit_rate DECIMAL(5,2),
  
  UNIQUE(page_path, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_page_stats_date ON analytics_page_stats(date);

-- Visitor journey tracking
CREATE TABLE IF NOT EXISTS analytics_visitor_journeys (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- First touch
  first_visit_at TIMESTAMP,
  first_referrer TEXT,
  first_utm_source VARCHAR(100),
  
  -- Engagement history
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Chat engagement
  chat_sessions INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  
  -- Conversion
  itineraries_generated INTEGER DEFAULT 0,
  booking_attempts INTEGER DEFAULT 0,
  deposits_paid INTEGER DEFAULT 0,
  total_booking_value DECIMAL(10,2) DEFAULT 0,
  
  -- Lifecycle
  last_visit_at TIMESTAMP,
  days_since_first_visit INTEGER,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_journeys_visitor ON analytics_visitor_journeys(visitor_id);

-- ============================================================================
-- SECTION 6: User Extensions
-- ============================================================================

-- Add contributor fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_contributor BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kb_business_id INTEGER REFERENCES kb_businesses(id);

-- ============================================================================
-- SECTION 7: Views
-- ============================================================================

-- Conversion funnel analytics view
CREATE OR REPLACE VIEW kb_conversion_funnel AS
SELECT 
  DATE_TRUNC('week', s.started_at) as week,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN s.message_count >= 5 THEN s.id END) as engaged_sessions,
  COUNT(DISTINCT ts.id) as sessions_with_selections,
  COUNT(DISTINCT CASE WHEN ts.ready_for_deposit THEN ts.id END) as ready_for_deposit,
  COUNT(DISTINCT db.id) as draft_bookings_created,
  COUNT(DISTINCT CASE WHEN db.status = 'deposit_paid' THEN db.id END) as deposits_paid,
  COUNT(DISTINCT CASE WHEN db.converted_booking_id IS NOT NULL THEN db.id END) as converted_to_booking
FROM kb_chat_sessions s
LEFT JOIN kb_trip_states ts ON s.id = ts.session_id
LEFT JOIN kb_draft_bookings db ON s.id = db.chat_session_id
GROUP BY DATE_TRUNC('week', s.started_at)
ORDER BY week DESC;

-- Real-time visitors (last 5 minutes)
CREATE OR REPLACE VIEW analytics_realtime AS
SELECT 
  COUNT(DISTINCT visitor_id) as active_visitors,
  COUNT(DISTINCT session_id) as active_sessions,
  COUNT(DISTINCT CASE WHEN event_type = 'chat_open' THEN session_id END) as in_chat,
  COUNT(DISTINCT CASE WHEN page_path LIKE '/booking%' THEN session_id END) as on_booking
FROM analytics_events
WHERE timestamp > NOW() - INTERVAL '5 minutes';

-- Daily traffic summary
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  COUNT(DISTINCT visitor_id) as unique_visitors,
  AVG(page_views) as avg_pages_per_session,
  AVG(total_time_seconds) as avg_session_duration,
  SUM(CASE WHEN opened_chat THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100 as chat_open_rate,
  SUM(CASE WHEN completed_deposit THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100 as conversion_rate
FROM analytics_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;

-- ============================================================================
-- SECTION 8: Insert Default Pricing Config
-- ============================================================================

INSERT INTO kb_pricing_config (
  rate_sedan, rate_suv, rate_van, rate_sprinter,
  rate_guide_per_day,
  default_tasting_fee, tasting_fee_note,
  avg_breakfast, avg_lunch, avg_dinner,
  deposit_percentage, is_active
) VALUES (
  350.00, 400.00, 500.00, 650.00,
  300.00,
  25.00, 'Typically $20-50 per person, often waived with purchase',
  20.00, 35.00, 75.00,
  0.50, TRUE
) ON CONFLICT DO NOTHING;
