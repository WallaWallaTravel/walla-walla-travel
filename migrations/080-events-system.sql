-- Migration 080: Events System
-- Creates event_categories and events tables for the multi-domain events system
-- wallawallaevents.com + wallawalla.travel/events

BEGIN;

-- ============================================================================
-- EVENT CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed categories
INSERT INTO event_categories (name, slug, description, icon, display_order) VALUES
  ('Wine & Spirits', 'wine-spirits', 'Wine releases, barrel tastings, spirit events, and vineyard celebrations', '🍷', 1),
  ('Festivals', 'festivals', 'Multi-day festivals, street fairs, and community celebrations', '🎪', 2),
  ('Live Music', 'live-music', 'Concerts, live performances, and music series', '🎵', 3),
  ('Food & Dining', 'food-dining', 'Culinary events, wine dinners, food trucks, and chef showcases', '🍽️', 4),
  ('Art & Culture', 'art-culture', 'Gallery openings, theater, museum exhibits, and cultural events', '🎨', 5),
  ('Farmers Markets', 'farmers-markets', 'Local produce, artisan goods, and seasonal markets', '🌿', 6),
  ('Outdoor & Recreation', 'outdoor-recreation', 'Hikes, bike rides, outdoor yoga, and adventure activities', '🏔️', 7),
  ('Family', 'family', 'Kid-friendly events, family activities, and educational programs', '👨‍👩‍👧‍👦', 8),
  ('Community', 'community', 'Town halls, volunteer events, and community gatherings', '🏘️', 9),
  ('Holiday & Seasonal', 'holiday-seasonal', 'Holiday celebrations, seasonal traditions, and themed events', '🎄', 10),
  ('Charity & Fundraiser', 'charity-fundraiser', 'Benefit events, galas, auctions, and fundraising activities', '💝', 11),
  ('Business & Networking', 'business-networking', 'Professional meetups, workshops, and networking events', '💼', 12)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  short_description VARCHAR(200),
  description TEXT NOT NULL,

  -- Categorization
  category_id INTEGER REFERENCES event_categories(id),
  tags TEXT[],

  -- Date/Time
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,

  -- Location
  venue_name VARCHAR(255),
  address TEXT,
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(2) DEFAULT 'WA',
  zip VARCHAR(10),

  -- Media
  featured_image_url TEXT,
  gallery_urls TEXT[],

  -- Pricing
  is_free BOOLEAN DEFAULT true,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  ticket_url TEXT,

  -- Organizer (nullable until Phase 2)
  organizer_id INTEGER,
  organizer_name VARCHAR(255),
  organizer_website TEXT,
  organizer_email VARCHAR(255),
  organizer_phone VARCHAR(50),

  -- Publishing
  status VARCHAR(20) DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  feature_priority INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,

  -- SEO
  meta_title VARCHAR(255),
  meta_description VARCHAR(300),

  -- Analytics
  view_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Timestamps
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for valid status values
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'past', 'pending_review'));

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_is_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX idx_events_status_start_date ON events(status, start_date);
CREATE INDEX idx_events_category_status ON events(category_id, status);

CREATE INDEX idx_event_categories_slug ON event_categories(slug);
CREATE INDEX idx_event_categories_active ON event_categories(is_active) WHERE is_active = true;

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

COMMIT;
