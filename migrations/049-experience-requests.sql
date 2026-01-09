-- Migration: 049-experience-requests.sql
-- Description: Create experience_requests table for concierge booking model
-- Created: 2026-01-08
-- Purpose: Store "Request This Experience" submissions from users
--          Keeps users on wallawalla.travel instead of redirecting to external booking systems

-- ============================================================
-- EXPERIENCE_REQUESTS TABLE
-- ============================================================
-- Concierge-style booking requests where staff coordinate winery visits
-- Users never leave the site - we handle all coordination behind the scenes

CREATE TABLE IF NOT EXISTS experience_requests (
  id SERIAL PRIMARY KEY,

  -- Request identification
  request_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., EXP-2026-0001

  -- Contact information
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),

  -- Request details
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 50),
  preferred_date DATE NOT NULL,
  alternate_date DATE,
  preferred_time VARCHAR(20),  -- 'morning', 'afternoon', 'flexible'

  -- Wineries/experiences requested
  winery_ids INTEGER[] DEFAULT '{}',  -- Array of winery IDs
  experience_type VARCHAR(50) DEFAULT 'wine_tour',  -- 'wine_tour', 'private_tasting', 'group_event', 'corporate'

  -- Guest preferences
  special_requests TEXT,
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  occasion VARCHAR(100),  -- 'birthday', 'anniversary', 'corporate', 'friends_trip' (no 'bachelorette'!)

  -- Source tracking (which brand/GPT sent this)
  brand VARCHAR(20) DEFAULT 'wwt',  -- 'wwt', 'nwtc', 'hcwt'
  source VARCHAR(50) DEFAULT 'website',  -- 'website', 'chatgpt', 'phone', 'email', 'referral'
  source_session_id VARCHAR(100),  -- For ChatGPT session tracking

  -- Processing status
  status VARCHAR(30) DEFAULT 'new',  -- 'new', 'contacted', 'in_progress', 'confirmed', 'declined', 'completed', 'cancelled'
  assigned_to INTEGER REFERENCES users(id),

  -- Admin notes
  internal_notes TEXT,

  -- Communication tracking
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  follow_up_date DATE,

  -- If converted to a booking
  converted_booking_id INTEGER REFERENCES bookings(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- For admin queue views
CREATE INDEX IF NOT EXISTS idx_experience_requests_status
  ON experience_requests(status, created_at DESC);

-- For filtering by brand
CREATE INDEX IF NOT EXISTS idx_experience_requests_brand
  ON experience_requests(brand, status);

-- For date-based filtering
CREATE INDEX IF NOT EXISTS idx_experience_requests_preferred_date
  ON experience_requests(preferred_date);

-- For follow-up reminders
CREATE INDEX IF NOT EXISTS idx_experience_requests_follow_up
  ON experience_requests(follow_up_date)
  WHERE follow_up_date IS NOT NULL AND status NOT IN ('completed', 'cancelled', 'declined');

-- For email lookup
CREATE INDEX IF NOT EXISTS idx_experience_requests_email
  ON experience_requests(contact_email);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE experience_requests IS 'Concierge-style experience requests - users request, staff coordinates';
COMMENT ON COLUMN experience_requests.request_number IS 'Human-readable request reference (EXP-YYYY-NNNN)';
COMMENT ON COLUMN experience_requests.brand IS 'Source brand: wwt (Walla Walla Travel), nwtc (NW Touring), hcwt (Herding Cats)';
COMMENT ON COLUMN experience_requests.source IS 'How request originated: website, chatgpt, phone, email, referral';
COMMENT ON COLUMN experience_requests.occasion IS 'Event type - excludes party-type occasions for Herding Cats brand protection';
COMMENT ON COLUMN experience_requests.status IS 'Workflow status: new->contacted->in_progress->confirmed/declined->completed/cancelled';

-- ============================================================
-- SEQUENCE FOR REQUEST NUMBERS
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS experience_request_number_seq START 1;

-- ============================================================
-- FUNCTION TO GENERATE REQUEST NUMBER
-- ============================================================

CREATE OR REPLACE FUNCTION generate_experience_request_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  year_part VARCHAR(4);
  seq_part INTEGER;
BEGIN
  year_part := to_char(now(), 'YYYY');
  seq_part := nextval('experience_request_number_seq');
  RETURN 'EXP-' || year_part || '-' || lpad(seq_part::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER TO AUTO-SET REQUEST NUMBER
-- ============================================================

CREATE OR REPLACE FUNCTION set_experience_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := generate_experience_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_experience_request_number ON experience_requests;
CREATE TRIGGER trigger_set_experience_request_number
  BEFORE INSERT ON experience_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_experience_request_number();

-- ============================================================
-- TRIGGER TO UPDATE updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_experience_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_experience_request_updated_at ON experience_requests;
CREATE TRIGGER trigger_experience_request_updated_at
  BEFORE UPDATE ON experience_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_experience_request_timestamp();
