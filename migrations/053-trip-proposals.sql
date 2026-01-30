-- ============================================================================
-- Trip Proposals Feature - Comprehensive Multi-Day Trip Planning
-- ============================================================================
-- Enables staff to build comprehensive trip proposals with:
-- - Multi-day itineraries
-- - Hotels/accommodations
-- - Restaurants/meals
-- - Multiple wineries per day
-- - Pricing and deposits
-- - Conversion to bookings and driver itineraries
-- ============================================================================

BEGIN;

-- Record migration start
INSERT INTO _migrations (migration_name, notes)
VALUES ('053-trip-proposals', 'Comprehensive trip proposal system for multi-day trips')
ON CONFLICT (migration_name) DO NOTHING;

-- ============================================================================
-- TRIP_PROPOSALS TABLE - Core multi-day trip proposal
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposals (
  id SERIAL PRIMARY KEY,
  proposal_number VARCHAR(30) UNIQUE NOT NULL,  -- TP-2026-XXXXX format

  -- Status lifecycle
  status VARCHAR(30) DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted')
  ),

  -- Customer information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_company VARCHAR(255),
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- Trip details
  trip_type VARCHAR(50) DEFAULT 'wine_tour' CHECK (
    trip_type IN ('wine_tour', 'bachelorette', 'corporate', 'wedding', 'anniversary', 'family', 'romantic', 'custom')
  ),
  trip_title VARCHAR(255),
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 100),

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL for single-day

  -- Pricing breakdown
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_reason TEXT,
  taxes DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,4) DEFAULT 0.089,  -- 8.9% default
  gratuity_percentage INTEGER DEFAULT 0,
  gratuity_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,

  -- Deposit
  deposit_percentage INTEGER DEFAULT 50,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_at TIMESTAMPTZ,
  deposit_payment_id INTEGER REFERENCES payments(id),

  -- Final payment
  balance_due DECIMAL(10,2) DEFAULT 0,
  balance_paid BOOLEAN DEFAULT FALSE,
  balance_paid_at TIMESTAMPTZ,
  balance_payment_id INTEGER REFERENCES payments(id),

  -- Validity
  valid_until DATE,

  -- Branding
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,

  -- Content
  introduction TEXT,  -- Custom intro message
  special_notes TEXT,  -- Notes shown to client
  internal_notes TEXT,  -- Staff-only notes

  -- Conversion tracking
  converted_to_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- View tracking
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,

  -- Acceptance
  accepted_at TIMESTAMPTZ,
  accepted_signature TEXT,  -- Base64 signature or name
  accepted_ip VARCHAR(50),

  -- Metadata
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_proposals
CREATE INDEX IF NOT EXISTS idx_trip_proposals_number ON trip_proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_trip_proposals_status ON trip_proposals(status);
CREATE INDEX IF NOT EXISTS idx_trip_proposals_customer_email ON trip_proposals(customer_email);
CREATE INDEX IF NOT EXISTS idx_trip_proposals_start_date ON trip_proposals(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_proposals_brand ON trip_proposals(brand_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposals_created ON trip_proposals(created_at DESC);

-- ============================================================================
-- TRIP_PROPOSAL_DAYS TABLE - Days within a multi-day trip
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposal_days (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Day info
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  date DATE NOT NULL,
  title VARCHAR(255),  -- "Day 1: Wine Country Exploration"
  description TEXT,

  -- Day-level pricing (optional override)
  subtotal DECIMAL(10,2) DEFAULT 0,  -- Sum of stops for this day

  -- Notes
  notes TEXT,  -- Client-facing
  internal_notes TEXT,  -- Staff-only

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique day numbers per proposal
  UNIQUE(trip_proposal_id, day_number)
);

-- Indexes for trip_proposal_days
CREATE INDEX IF NOT EXISTS idx_trip_proposal_days_proposal ON trip_proposal_days(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_days_date ON trip_proposal_days(date);

-- ============================================================================
-- TRIP_PROPOSAL_STOPS TABLE - Stops within each day
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposal_stops (
  id SERIAL PRIMARY KEY,
  trip_proposal_day_id INTEGER NOT NULL REFERENCES trip_proposal_days(id) ON DELETE CASCADE,

  -- Stop ordering
  stop_order INTEGER NOT NULL CHECK (stop_order >= 0),

  -- Stop type
  stop_type VARCHAR(50) NOT NULL CHECK (
    stop_type IN ('pickup', 'winery', 'restaurant', 'hotel_checkin', 'hotel_checkout', 'activity', 'dropoff', 'custom')
  ),

  -- Venue references (polymorphic - only one should be set based on stop_type)
  winery_id INTEGER REFERENCES wineries(id) ON DELETE SET NULL,
  restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
  hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
  -- activity_id would go here if you have an activities table

  -- For custom stops or when venue not in database
  custom_name VARCHAR(255),
  custom_address TEXT,
  custom_description TEXT,

  -- Scheduling
  scheduled_time TIME,  -- When to arrive
  duration_minutes INTEGER,  -- How long at this stop

  -- Pricing
  per_person_cost DECIMAL(10,2) DEFAULT 0,  -- e.g., tasting fee
  flat_cost DECIMAL(10,2) DEFAULT 0,  -- e.g., private tour fee
  cost_notes TEXT,  -- "Tasting fee waived for groups of 8+"

  -- For hotel stops
  room_rate DECIMAL(10,2) DEFAULT 0,  -- Per night
  num_rooms INTEGER DEFAULT 0,
  nights INTEGER DEFAULT 1,

  -- Reservation status
  reservation_status VARCHAR(30) DEFAULT 'pending' CHECK (
    reservation_status IN ('pending', 'requested', 'confirmed', 'waitlist', 'cancelled', 'na')
  ),
  reservation_confirmation VARCHAR(100),
  reservation_contact VARCHAR(255),
  reservation_notes TEXT,

  -- Notes
  client_notes TEXT,  -- Shown to client
  internal_notes TEXT,  -- Staff only
  driver_notes TEXT,  -- For driver itinerary

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_proposal_stops
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_day ON trip_proposal_stops(trip_proposal_day_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_type ON trip_proposal_stops(stop_type);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_winery ON trip_proposal_stops(winery_id) WHERE winery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_restaurant ON trip_proposal_stops(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_hotel ON trip_proposal_stops(hotel_id) WHERE hotel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trip_proposal_stops_order ON trip_proposal_stops(trip_proposal_day_id, stop_order);

-- ============================================================================
-- TRIP_PROPOSAL_GUESTS TABLE - Guest list with dietary/accessibility needs
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposal_guests (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Guest info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),

  -- Role
  is_primary BOOLEAN DEFAULT FALSE,  -- Main point of contact

  -- Needs & preferences
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  special_requests TEXT,

  -- Room assignment (for multi-day with hotels)
  room_assignment VARCHAR(100),  -- "Room 201" or "Sharing with John"

  -- RSVP (if sending to guests)
  rsvp_status VARCHAR(30) DEFAULT 'pending' CHECK (
    rsvp_status IN ('pending', 'confirmed', 'declined', 'maybe')
  ),
  rsvp_responded_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_proposal_guests
CREATE INDEX IF NOT EXISTS idx_trip_proposal_guests_proposal ON trip_proposal_guests(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_guests_email ON trip_proposal_guests(email);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_guests_primary ON trip_proposal_guests(trip_proposal_id, is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- TRIP_PROPOSAL_INCLUSIONS TABLE - Transportation and other line items
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposal_inclusions (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Inclusion details
  inclusion_type VARCHAR(50) NOT NULL CHECK (
    inclusion_type IN ('transportation', 'chauffeur', 'gratuity', 'planning_fee', 'custom')
  ),
  description TEXT NOT NULL,

  -- Pricing
  quantity DECIMAL(10,2) DEFAULT 1,  -- e.g., hours, days
  unit VARCHAR(50),  -- 'hours', 'days', 'flat'
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,

  -- Display
  sort_order INTEGER DEFAULT 0,
  show_on_proposal BOOLEAN DEFAULT TRUE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_proposal_inclusions
CREATE INDEX IF NOT EXISTS idx_trip_proposal_inclusions_proposal ON trip_proposal_inclusions(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_inclusions_type ON trip_proposal_inclusions(inclusion_type);

-- ============================================================================
-- TRIP_PROPOSAL_ACTIVITY TABLE - Activity/audit log
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_proposal_activity (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,

  -- Activity
  action VARCHAR(100) NOT NULL,  -- created, updated, sent, viewed, accepted, etc.
  description TEXT,

  -- Actor
  actor_type VARCHAR(30),  -- 'staff', 'customer', 'system'
  actor_name VARCHAR(255),
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_proposal_activity
CREATE INDEX IF NOT EXISTS idx_trip_proposal_activity_proposal ON trip_proposal_activity(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_activity_action ON trip_proposal_activity(action);
CREATE INDEX IF NOT EXISTS idx_trip_proposal_activity_created ON trip_proposal_activity(created_at DESC);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Update trip_proposals.updated_at on change
CREATE OR REPLACE FUNCTION update_trip_proposals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_proposals_updated_at ON trip_proposals;
CREATE TRIGGER trip_proposals_updated_at
  BEFORE UPDATE ON trip_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_proposals_timestamp();

-- Update trip_proposal_days.updated_at on change
DROP TRIGGER IF EXISTS trip_proposal_days_updated_at ON trip_proposal_days;
CREATE TRIGGER trip_proposal_days_updated_at
  BEFORE UPDATE ON trip_proposal_days
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_proposals_timestamp();

-- Update trip_proposal_stops.updated_at on change
DROP TRIGGER IF EXISTS trip_proposal_stops_updated_at ON trip_proposal_stops;
CREATE TRIGGER trip_proposal_stops_updated_at
  BEFORE UPDATE ON trip_proposal_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_proposals_timestamp();

-- Update trip_proposal_guests.updated_at on change
DROP TRIGGER IF EXISTS trip_proposal_guests_updated_at ON trip_proposal_guests;
CREATE TRIGGER trip_proposal_guests_updated_at
  BEFORE UPDATE ON trip_proposal_guests
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_proposals_timestamp();

-- Update trip_proposal_inclusions.updated_at on change
DROP TRIGGER IF EXISTS trip_proposal_inclusions_updated_at ON trip_proposal_inclusions;
CREATE TRIGGER trip_proposal_inclusions_updated_at
  BEFORE UPDATE ON trip_proposal_inclusions
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_proposals_timestamp();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate unique trip proposal number
CREATE OR REPLACE FUNCTION generate_trip_proposal_number()
RETURNS VARCHAR(30) AS $$
DECLARE
  prefix VARCHAR(2) := 'TP';
  year_part VARCHAR(4) := TO_CHAR(NOW(), 'YYYY');
  sequence_num INTEGER;
  proposal_number VARCHAR(30);
BEGIN
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(proposal_number FROM 9) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM trip_proposals
  WHERE proposal_number LIKE prefix || '-' || year_part || '-%';

  -- Format: TP-2026-00001
  proposal_number := prefix || '-' || year_part || '-' || LPAD(sequence_num::TEXT, 5, '0');

  RETURN proposal_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate trip proposal totals
CREATE OR REPLACE FUNCTION calculate_trip_proposal_totals(p_proposal_id INTEGER)
RETURNS TABLE(
  stops_subtotal DECIMAL,
  inclusions_subtotal DECIMAL,
  calculated_subtotal DECIMAL,
  calculated_taxes DECIMAL,
  calculated_total DECIMAL,
  calculated_deposit DECIMAL
) AS $$
DECLARE
  v_tax_rate DECIMAL;
  v_deposit_percentage INTEGER;
  v_discount_percentage DECIMAL;
  v_stops_total DECIMAL;
  v_inclusions_total DECIMAL;
  v_subtotal DECIMAL;
  v_discount DECIMAL;
  v_subtotal_after_discount DECIMAL;
  v_taxes DECIMAL;
  v_total DECIMAL;
  v_deposit DECIMAL;
BEGIN
  -- Get proposal settings
  SELECT
    COALESCE(tax_rate, 0.089),
    COALESCE(deposit_percentage, 50),
    COALESCE(discount_percentage, 0)
  INTO v_tax_rate, v_deposit_percentage, v_discount_percentage
  FROM trip_proposals
  WHERE id = p_proposal_id;

  -- Calculate stops total
  SELECT COALESCE(SUM(
    (per_person_cost * (SELECT party_size FROM trip_proposals WHERE id = p_proposal_id)) +
    flat_cost +
    (room_rate * num_rooms * nights)
  ), 0)
  INTO v_stops_total
  FROM trip_proposal_stops s
  JOIN trip_proposal_days d ON s.trip_proposal_day_id = d.id
  WHERE d.trip_proposal_id = p_proposal_id;

  -- Calculate inclusions total
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_inclusions_total
  FROM trip_proposal_inclusions
  WHERE trip_proposal_id = p_proposal_id;

  -- Calculate totals
  v_subtotal := v_stops_total + v_inclusions_total;
  v_discount := v_subtotal * (v_discount_percentage / 100);
  v_subtotal_after_discount := v_subtotal - v_discount;
  v_taxes := v_subtotal_after_discount * v_tax_rate;
  v_total := v_subtotal_after_discount + v_taxes;
  v_deposit := v_total * (v_deposit_percentage::DECIMAL / 100);

  RETURN QUERY SELECT
    v_stops_total,
    v_inclusions_total,
    v_subtotal_after_discount,
    v_taxes,
    v_total,
    v_deposit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE trip_proposals IS 'Multi-day trip proposals with pricing, for staff to create comprehensive quotes';
COMMENT ON TABLE trip_proposal_days IS 'Individual days within a multi-day trip proposal';
COMMENT ON TABLE trip_proposal_stops IS 'Stops (wineries, restaurants, hotels, activities) within each day';
COMMENT ON TABLE trip_proposal_guests IS 'Guest list with dietary/accessibility needs and room assignments';
COMMENT ON TABLE trip_proposal_inclusions IS 'Transportation, fees, and other line items in the proposal';
COMMENT ON TABLE trip_proposal_activity IS 'Audit log of all activity on a trip proposal';

COMMENT ON COLUMN trip_proposals.proposal_number IS 'Unique identifier in format TP-YYYY-XXXXX';
COMMENT ON COLUMN trip_proposals.trip_type IS 'Type of trip for categorization and template selection';
COMMENT ON COLUMN trip_proposal_stops.stop_type IS 'Type of stop: pickup, winery, restaurant, hotel, activity, dropoff, custom';
COMMENT ON COLUMN trip_proposal_stops.reservation_status IS 'Tracking whether reservations have been made';

COMMIT;

-- Record successful completion
INSERT INTO _migrations (migration_name, notes)
VALUES ('053-trip-proposals-complete', 'Trip proposal system created successfully')
ON CONFLICT (migration_name) DO UPDATE SET applied_at = NOW();
