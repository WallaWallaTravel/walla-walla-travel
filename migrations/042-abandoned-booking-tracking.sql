-- Migration: 042-abandoned-booking-tracking.sql
-- Purpose: Track abandoned booking attempts for follow-up
-- Author: Claude Code
-- Date: 2025-12-27

-- ============================================
-- UP MIGRATION
-- ============================================

-- Table to store booking attempts (abandoned carts)
CREATE TABLE IF NOT EXISTS booking_attempts (
  id SERIAL PRIMARY KEY,

  -- Session tracking
  session_id VARCHAR(64) NOT NULL,  -- Browser session ID
  visitor_id VARCHAR(64),           -- Persistent visitor ID (cookie)

  -- Contact info (as provided)
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(50),

  -- Booking details (as selected)
  tour_date DATE,
  start_time TIME,
  duration_hours DECIMAL(4,2),
  party_size INTEGER,
  pickup_location TEXT,

  -- Selected wineries
  selected_wineries JSONB DEFAULT '[]',

  -- Progress tracking
  step_reached VARCHAR(50) NOT NULL DEFAULT 'started',  -- started, contact_info, date_selection, wineries, payment, completed
  form_data JSONB DEFAULT '{}',  -- Full form state for restoration

  -- Conversion tracking
  converted_to_booking_id INTEGER REFERENCES bookings(id),
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Follow-up tracking
  follow_up_sent_at TIMESTAMP WITH TIME ZONE,
  follow_up_email_id VARCHAR(100),  -- Resend email ID
  unsubscribed BOOLEAN DEFAULT FALSE,

  -- Source tracking
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referrer TEXT,
  landing_page TEXT,

  -- Device info
  user_agent TEXT,
  device_type VARCHAR(20),  -- mobile, tablet, desktop
  browser VARCHAR(50),

  -- Metadata
  brand_id INTEGER REFERENCES brands(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_booking_attempts_email ON booking_attempts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_attempts_session ON booking_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_visitor ON booking_attempts(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_attempts_step ON booking_attempts(step_reached);
CREATE INDEX IF NOT EXISTS idx_booking_attempts_unconverted ON booking_attempts(created_at)
  WHERE converted_to_booking_id IS NULL AND step_reached != 'started';
CREATE INDEX IF NOT EXISTS idx_booking_attempts_followup ON booking_attempts(created_at)
  WHERE converted_to_booking_id IS NULL
  AND follow_up_sent_at IS NULL
  AND email IS NOT NULL
  AND unsubscribed = FALSE;

-- Anonymous visitor tracking (for analytics even without contact info)
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,  -- Persistent cookie ID
  session_id VARCHAR(64) NOT NULL,  -- Session ID

  -- First touch attribution
  first_referrer TEXT,
  first_landing_page TEXT,
  first_utm_source VARCHAR(100),
  first_utm_medium VARCHAR(100),
  first_utm_campaign VARCHAR(100),

  -- Session info
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_views INTEGER DEFAULT 1,

  -- Engagement tracking
  viewed_wineries JSONB DEFAULT '[]',
  viewed_tours JSONB DEFAULT '[]',
  availability_checks INTEGER DEFAULT 0,
  booking_started BOOLEAN DEFAULT FALSE,

  -- Device
  user_agent TEXT,
  device_type VARCHAR(20),
  browser VARCHAR(50),
  ip_country VARCHAR(2),
  ip_region VARCHAR(100),
  ip_city VARCHAR(100),

  -- Conversion
  converted_to_booking_id INTEGER REFERENCES bookings(id),
  converted_to_customer_id INTEGER REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started ON visitor_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_booking ON visitor_sessions(booking_started) WHERE booking_started = TRUE;

-- Page view tracking (lightweight)
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  visitor_id VARCHAR(64),
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);

-- Partitioning for page_views if it gets large (keep 90 days)
-- Note: Run this cleanup periodically
-- DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '90 days';

-- ============================================
-- DOWN MIGRATION (if reversible)
-- ============================================

-- DROP TABLE IF EXISTS page_views;
-- DROP TABLE IF EXISTS visitor_sessions;
-- DROP TABLE IF EXISTS booking_attempts;
