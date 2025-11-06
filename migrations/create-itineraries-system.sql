-- Itinerary System Database Schema
-- Creates tables for detailed day-by-day itinerary planning

-- Main itineraries table (one per booking)
CREATE TABLE IF NOT EXISTS itineraries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  proposal_id INTEGER REFERENCES proposals(id) ON DELETE SET NULL,
  
  -- Basic Info
  title VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  party_size INTEGER NOT NULL,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',  -- draft, finalized, sent, confirmed
  
  -- Notes
  internal_notes TEXT,
  client_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  last_modified_by INTEGER
);

-- Itinerary days (one per day of the trip)
CREATE TABLE IF NOT EXISTS itinerary_days (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER REFERENCES itineraries(id) ON DELETE CASCADE,
  
  -- Day Info
  day_number INTEGER NOT NULL,  -- 1, 2, 3, etc.
  date DATE NOT NULL,
  title VARCHAR(255),  -- e.g., "Wine Country Exploration"
  description TEXT,
  
  -- Display Order
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(itinerary_id, day_number)
);

-- Itinerary activities (individual stops/events within a day)
CREATE TABLE IF NOT EXISTS itinerary_activities (
  id SERIAL PRIMARY KEY,
  itinerary_day_id INTEGER REFERENCES itinerary_days(id) ON DELETE CASCADE,
  
  -- Activity Type
  activity_type VARCHAR(50) NOT NULL,  -- winery_visit, transfer, meal, accommodation, custom
  
  -- Timing
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  
  -- Location Info
  location_name VARCHAR(255),
  location_address TEXT,
  location_type VARCHAR(50),  -- winery, restaurant, hotel, airport, venue
  pickup_location VARCHAR(255),
  dropoff_location VARCHAR(255),
  
  -- Winery-specific
  winery_id INTEGER,
  tasting_included BOOLEAN DEFAULT false,
  tasting_fee DECIMAL(10,2),
  
  -- Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  notes TEXT,
  
  -- Display Order (for drag-and-drop)
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Link activities to specific wineries (for winery visits)
CREATE TABLE IF NOT EXISTS itinerary_activity_wineries (
  id SERIAL PRIMARY KEY,
  itinerary_activity_id INTEGER REFERENCES itinerary_activities(id) ON DELETE CASCADE,
  winery_id INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Itinerary attachments (photos, PDFs, etc.)
CREATE TABLE IF NOT EXISTS itinerary_attachments (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER REFERENCES itineraries(id) ON DELETE CASCADE,
  
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  
  description TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  uploaded_by INTEGER
);

-- Itinerary versions (for tracking changes)
CREATE TABLE IF NOT EXISTS itinerary_versions (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER REFERENCES itineraries(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,  -- Full itinerary data at this version
  
  change_summary TEXT,
  changed_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(itinerary_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itineraries_booking_id ON itineraries(booking_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_proposal_id ON itineraries(proposal_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON itineraries(status);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_date ON itinerary_days(date);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_day_id ON itinerary_activities(itinerary_day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_type ON itinerary_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_winery_id ON itinerary_activities(winery_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activity_wineries_activity_id ON itinerary_activity_wineries(itinerary_activity_id);

-- Add comments for documentation
COMMENT ON TABLE itineraries IS 'Main itinerary records, one per booking';
COMMENT ON TABLE itinerary_days IS 'Individual days within an itinerary';
COMMENT ON TABLE itinerary_activities IS 'Specific activities/stops within a day';
COMMENT ON TABLE itinerary_activity_wineries IS 'Links activities to wineries for multi-winery visits';
COMMENT ON TABLE itinerary_attachments IS 'Files attached to itineraries (photos, menus, etc.)';
COMMENT ON TABLE itinerary_versions IS 'Version history for tracking changes';

COMMENT ON COLUMN itineraries.status IS 'draft, finalized, sent, confirmed';
COMMENT ON COLUMN itinerary_activities.activity_type IS 'winery_visit, transfer, meal, accommodation, custom';
COMMENT ON COLUMN itinerary_activities.location_type IS 'winery, restaurant, hotel, airport, venue';

