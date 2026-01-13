-- ============================================================================
-- Trip Planner Feature - Database Schema
-- ============================================================================
-- Enables users to build and share wine trip itineraries
-- with stops, guests, and handoff to Walla Walla Travel planning team
-- ============================================================================

-- ============================================================================
-- TRIPS TABLE - Core trip data
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
  id SERIAL PRIMARY KEY,
  share_code VARCHAR(16) UNIQUE NOT NULL,

  -- Trip Info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  trip_type VARCHAR(50) DEFAULT 'wine_tour' CHECK (
    trip_type IN ('wine_tour', 'bachelorette', 'corporate', 'wedding', 'anniversary', 'custom')
  ),

  -- Dates
  start_date DATE,
  end_date DATE,
  dates_flexible BOOLEAN DEFAULT TRUE,

  -- Guests
  expected_guests INTEGER DEFAULT 2 CHECK (expected_guests >= 1 AND expected_guests <= 100),
  confirmed_guests INTEGER DEFAULT 0,

  -- Owner Contact (no login required)
  owner_name VARCHAR(255),
  owner_email VARCHAR(255),
  owner_phone VARCHAR(50),

  -- Preferences (JSONB)
  preferences JSONB DEFAULT '{"transportation": "undecided", "pace": "moderate", "budget": "moderate"}'::jsonb,

  -- Access Control
  is_public BOOLEAN DEFAULT FALSE,
  allow_guest_suggestions BOOLEAN DEFAULT TRUE,
  allow_guest_rsvp BOOLEAN DEFAULT TRUE,

  -- Status
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'planning', 'ready_to_share', 'shared', 'handed_off', 'booked', 'completed', 'cancelled')
  ),

  -- Handoff to planning team
  handoff_requested_at TIMESTAMPTZ,
  handoff_notes TEXT,
  assigned_staff_id INTEGER, -- Optional: staff member assigned (no FK for flexibility)
  converted_to_booking_id INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trips
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code);
CREATE INDEX IF NOT EXISTS idx_trips_owner_email ON trips(owner_email);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- ============================================================================
-- TRIP_STOPS TABLE - Itinerary stops
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_stops (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Stop Details
  stop_type VARCHAR(50) NOT NULL CHECK (
    stop_type IN ('winery', 'restaurant', 'activity', 'accommodation', 'transportation', 'custom')
  ),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- External Links (optional - no FK for flexibility with wineries table)
  winery_id INTEGER,

  -- Scheduling
  day_number INTEGER DEFAULT 1 CHECK (day_number >= 1),
  stop_order INTEGER DEFAULT 0,
  planned_arrival VARCHAR(10),  -- Format: "10:00 AM"
  planned_departure VARCHAR(10), -- Format: "11:30 AM"
  duration_minutes INTEGER,

  -- Status
  status VARCHAR(50) DEFAULT 'suggested' CHECK (
    status IN ('suggested', 'confirmed', 'booked', 'cancelled')
  ),
  booking_confirmation VARCHAR(100),

  -- Notes
  notes TEXT,
  special_requests TEXT,
  estimated_cost_per_person DECIMAL(10,2),

  -- Metadata
  added_by VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_stops
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_id ON trip_stops(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_stops_day_order ON trip_stops(trip_id, day_number, stop_order);
CREATE INDEX IF NOT EXISTS idx_trip_stops_winery_id ON trip_stops(winery_id);

-- ============================================================================
-- TRIP_GUESTS TABLE - Guest list with RSVP
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_guests (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Guest Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),

  -- RSVP
  rsvp_status VARCHAR(50) DEFAULT 'pending' CHECK (
    rsvp_status IN ('pending', 'invited', 'attending', 'declined', 'maybe')
  ),
  rsvp_responded_at TIMESTAMPTZ,
  rsvp_notes TEXT,

  -- Role
  is_organizer BOOLEAN DEFAULT FALSE,

  -- Needs
  dietary_restrictions TEXT,
  accessibility_needs TEXT,

  -- Tracking
  invite_sent_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_guests
CREATE INDEX IF NOT EXISTS idx_trip_guests_trip_id ON trip_guests(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_guests_email ON trip_guests(email);
CREATE INDEX IF NOT EXISTS idx_trip_guests_rsvp_status ON trip_guests(trip_id, rsvp_status);

-- ============================================================================
-- TRIP_ACTIVITY_LOG TABLE - Activity tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_activity_log (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,

  -- Activity Details
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,

  -- Actor
  actor_type VARCHAR(50), -- 'owner', 'guest', 'staff'
  actor_name VARCHAR(255),

  -- Additional Data
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trip_activity_log
CREATE INDEX IF NOT EXISTS idx_trip_activity_trip_id ON trip_activity_log(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_type ON trip_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_trip_activity_created_at ON trip_activity_log(created_at DESC);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Update trips.updated_at on change
CREATE OR REPLACE FUNCTION update_trips_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trips_updated_at ON trips;
CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_trips_timestamp();

-- Update trip.last_activity_at when stops/guests change
CREATE OR REPLACE FUNCTION update_trip_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE trips SET last_activity_at = NOW() WHERE id = COALESCE(NEW.trip_id, OLD.trip_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trip_stops_activity ON trip_stops;
CREATE TRIGGER trip_stops_activity
  AFTER INSERT OR UPDATE OR DELETE ON trip_stops
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_activity();

DROP TRIGGER IF EXISTS trip_guests_activity ON trip_guests;
CREATE TRIGGER trip_guests_activity
  AFTER INSERT OR UPDATE OR DELETE ON trip_guests
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_activity();

-- ============================================================================
-- INITIAL DATA (Optional test trip for development)
-- ============================================================================
-- Uncomment to add a test trip:
/*
INSERT INTO trips (share_code, title, trip_type, start_date, end_date, expected_guests, owner_name, owner_email, status)
VALUES ('TESTTRIP', 'Test Wine Tour', 'wine_tour', '2026-02-14', '2026-02-15', 4, 'Test User', 'test@example.com', 'draft');
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE trips IS 'User-created wine trip itineraries with planning and sharing features';
COMMENT ON TABLE trip_stops IS 'Individual stops (wineries, restaurants, etc.) within a trip itinerary';
COMMENT ON TABLE trip_guests IS 'Guest list for trips with RSVP tracking';
COMMENT ON TABLE trip_activity_log IS 'Activity history for trip changes and collaboration';

COMMENT ON COLUMN trips.share_code IS 'Unique URL-friendly code for sharing trip (e.g., abc123xy)';
COMMENT ON COLUMN trips.preferences IS 'JSON object with transportation, pace, budget preferences';
COMMENT ON COLUMN trips.handoff_requested_at IS 'Timestamp when user requested Walla Walla Travel to take over planning';
COMMENT ON COLUMN trip_stops.day_number IS 'Which day of the trip (1, 2, 3, etc.)';
COMMENT ON COLUMN trip_stops.stop_order IS 'Order within that day (0, 1, 2, etc.)';
