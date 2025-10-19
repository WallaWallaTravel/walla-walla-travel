-- Wineries Database for Itinerary Builder
-- Created: October 19, 2025

-- Main wineries table
CREATE TABLE IF NOT EXISTS wineries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Location
  address TEXT,
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Basic Info
  description TEXT,
  vibe TEXT, -- "approachable", "upscale", "romantic", "family-friendly"
  specialty VARCHAR(255), -- "Rhone varietals", "Cabernet focus", "Organic"
  
  -- Operational Details
  tasting_fee DECIMAL(10,2),
  reservation_required BOOLEAN DEFAULT false,
  group_size_max INTEGER DEFAULT 12,
  duration_minutes INTEGER DEFAULT 60, -- Typical visit duration
  
  -- Features
  has_food BOOLEAN DEFAULT false,
  has_outdoor_seating BOOLEAN DEFAULT false,
  has_event_space BOOLEAN DEFAULT false,
  has_vineyard_tours BOOLEAN DEFAULT false,
  wheelchair_accessible BOOLEAN DEFAULT false,
  pet_friendly BOOLEAN DEFAULT false,
  
  -- AI Experience (Future Phase 2)
  ai_summary TEXT,
  culture_tags TEXT[], -- ['family-owned', 'historic', 'modern', 'boutique']
  perfect_for_tags TEXT[], -- ['wine-enthusiasts', 'beginners', 'groups', 'romantic']
  
  -- Media
  hero_image_url TEXT,
  gallery_images TEXT[],
  video_url TEXT,
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, seasonal
  popularity_score INTEGER DEFAULT 50, -- 1-100 for sorting
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Itineraries table (saved routes/templates)
CREATE TABLE IF NOT EXISTS itineraries (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Template Info (if saved as template)
  template_name VARCHAR(255), -- "Popular Route A", "Romantic Tour"
  is_template BOOLEAN DEFAULT false,
  
  -- Route Details
  pickup_location TEXT,
  pickup_time TIME,
  dropoff_location TEXT,
  estimated_dropoff_time TIME,
  total_drive_time_minutes INTEGER,
  
  -- Notes
  internal_notes TEXT,
  driver_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Individual stops on the itinerary
CREATE TABLE IF NOT EXISTS itinerary_stops (
  id SERIAL PRIMARY KEY,
  itinerary_id INTEGER REFERENCES itineraries(id) ON DELETE CASCADE,
  winery_id INTEGER REFERENCES wineries(id),
  
  -- Order and timing
  stop_order INTEGER NOT NULL, -- 1, 2, 3, etc.
  arrival_time TIME,
  departure_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  drive_time_to_next_minutes INTEGER,
  
  -- Stop details
  stop_type VARCHAR(50) DEFAULT 'winery', -- 'winery', 'lunch', 'photo_stop', 'break'
  reservation_confirmed BOOLEAN DEFAULT false,
  special_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customer preferences (track what they like)
CREATE TABLE IF NOT EXISTS customer_preferences (
  id SERIAL PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  
  -- Wine Preferences
  favorite_wine_types TEXT[], -- ['Cabernet', 'Syrah', 'Rosé']
  favorite_wineries INTEGER[], -- Array of winery IDs
  dietary_restrictions TEXT,
  accessibility_needs TEXT,
  
  -- History
  total_tours INTEGER DEFAULT 0,
  last_tour_date DATE,
  average_group_size INTEGER,
  vip_status BOOLEAN DEFAULT false,
  
  -- Notes
  internal_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample wineries
INSERT INTO wineries (
  name, slug, description, vibe, specialty,
  tasting_fee, group_size_max, duration_minutes,
  has_outdoor_seating, has_vineyard_tours, has_event_space,
  culture_tags, perfect_for_tags, popularity_score
) VALUES 
(
  'Saviah Cellars',
  'saviah-cellars',
  'Long-standing, family-owned winery with a personal touch and approachable wines. Nice variety across their portfolio.',
  'approachable',
  'Diverse portfolio, family-owned heritage',
  25.00,
  12,
  60,
  true,
  false,
  false,
  ARRAY['family-owned', 'established', 'personal-touch', 'approachable'],
  ARRAY['beginners', 'families', 'casual-wine-lovers', 'groups'],
  85
),
(
  'Rotie Cellars',
  'rotie-cellars',
  'Unique Rhone varietal focus in the Rocks District AVA. Stunning architecture with vineyard views. Features a party patio for special events and offers vineyard tours. Long-term, knowledgeable staff.',
  'distinctive',
  'Rhone varietals, Rocks District',
  30.00,
  15,
  75,
  true,
  true,
  true,
  ARRAY['rhone-specialist', 'rocks-district', 'architectural', 'educational'],
  ARRAY['wine-enthusiasts', 'photographers', 'special-occasions', 'educational-tours'],
  90
);

-- Create indexes for performance
CREATE INDEX idx_wineries_slug ON wineries(slug);
CREATE INDEX idx_wineries_status ON wineries(status);
CREATE INDEX idx_itinerary_stops_itinerary ON itinerary_stops(itinerary_id);
CREATE INDEX idx_itinerary_stops_winery ON itinerary_stops(winery_id);
CREATE INDEX idx_customer_prefs_email ON customer_preferences(customer_email);
