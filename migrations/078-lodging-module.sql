-- ============================================================================
-- Migration 078: Lodging Module
-- Creates public-facing lodging directory tables, click tracking, and
-- STR availability management.
-- ============================================================================

-- lodging_properties: All lodging for public directory
CREATE TABLE IF NOT EXISTS lodging_properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  property_type VARCHAR(50) NOT NULL,  -- hotel, str, bnb, vacation_rental, boutique_hotel, resort

  -- Location
  address VARCHAR(500),
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(50) DEFAULT 'WA',
  zip_code VARCHAR(20),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),

  -- Details
  description TEXT,
  short_description VARCHAR(500),
  amenities TEXT[] DEFAULT '{}',
  property_features TEXT[] DEFAULT '{}',
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  max_guests INTEGER,
  min_stay_nights INTEGER DEFAULT 1,

  -- Pricing (display only, not transactional)
  price_range_min NUMERIC(10,2),
  price_range_max NUMERIC(10,2),

  -- External Booking
  booking_url VARCHAR(1000),
  booking_platform VARCHAR(50),  -- direct, booking_com, expedia, airbnb, vrbo
  affiliate_code VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),

  -- Media
  cover_image_url VARCHAR(1000),
  images TEXT[] DEFAULT '{}',

  -- Policies
  check_in_time VARCHAR(20),
  check_out_time VARCHAR(20),
  cancellation_policy TEXT,
  pet_policy VARCHAR(100),

  -- Verification & Display
  is_verified BOOLEAN DEFAULT false,
  verified_by INTEGER,
  verified_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Relationships
  hotel_partner_id INTEGER REFERENCES hotel_partners(id),
  brand_id INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- lodging_clicks: Click tracking for booking redirects
CREATE TABLE IF NOT EXISTS lodging_clicks (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES lodging_properties(id),
  property_slug VARCHAR(255),
  platform VARCHAR(50),
  referrer TEXT,
  user_agent TEXT,
  ip_address VARCHAR(45),
  session_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- lodging_availability: STR date-level availability
CREATE TABLE IF NOT EXISTS lodging_availability (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES lodging_properties(id),
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'available',  -- available, booked, blocked
  nightly_rate NUMERIC(10,2),
  min_stay INTEGER,
  notes TEXT,
  UNIQUE(property_id, date)
);

-- Extend trip_stops for lodging integration
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS lodging_property_id INTEGER REFERENCES lodging_properties(id);
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS check_out_date DATE;

-- Indexes for lodging_properties
CREATE INDEX IF NOT EXISTS idx_lodging_properties_slug ON lodging_properties(slug);
CREATE INDEX IF NOT EXISTS idx_lodging_properties_type ON lodging_properties(property_type);
CREATE INDEX IF NOT EXISTS idx_lodging_properties_active ON lodging_properties(is_active);
CREATE INDEX IF NOT EXISTS idx_lodging_properties_verified ON lodging_properties(is_verified);
CREATE INDEX IF NOT EXISTS idx_lodging_properties_featured ON lodging_properties(is_featured);

-- Indexes for lodging_clicks
CREATE INDEX IF NOT EXISTS idx_lodging_clicks_property ON lodging_clicks(property_id);
CREATE INDEX IF NOT EXISTS idx_lodging_clicks_created ON lodging_clicks(created_at);

-- Indexes for lodging_availability
CREATE INDEX IF NOT EXISTS idx_lodging_availability_property_date ON lodging_availability(property_id, date);
