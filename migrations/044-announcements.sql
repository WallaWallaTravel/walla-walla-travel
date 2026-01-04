-- Migration: 044-announcements.sql
-- Description: Create announcements table for site-wide banners and promotions
-- Created: 2025-12-30

-- ============================================================
-- ANNOUNCEMENTS TABLE
-- ============================================================
-- Stores announcements for display across the site
-- Supports time-based activation, different types, and positioning

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link_text VARCHAR(100),
  link_url VARCHAR(500),
  type VARCHAR(20) DEFAULT 'info',        -- 'info', 'warning', 'promo', 'event'
  position VARCHAR(20) DEFAULT 'top',     -- 'top', 'homepage', 'booking'
  background_color VARCHAR(7),            -- hex color, null = use default for type
  starts_at TIMESTAMP WITH TIME ZONE,     -- null = immediately active
  expires_at TIMESTAMP WITH TIME ZONE,    -- null = never expires
  is_active BOOLEAN DEFAULT true,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for efficient querying of active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active
  ON announcements(is_active, starts_at, expires_at);

-- Index for position-based filtering
CREATE INDEX IF NOT EXISTS idx_announcements_position
  ON announcements(position, is_active);

-- Comment on table
COMMENT ON TABLE announcements IS 'Site-wide announcements and promotional banners';

-- Comments on columns
COMMENT ON COLUMN announcements.type IS 'Announcement type: info (blue), warning (amber), promo (purple), event (green)';
COMMENT ON COLUMN announcements.position IS 'Where to display: top (all pages), homepage (home only), booking (booking flow)';
COMMENT ON COLUMN announcements.background_color IS 'Optional hex color override (e.g., #FF5500)';
COMMENT ON COLUMN announcements.starts_at IS 'When to start showing (null = immediately)';
COMMENT ON COLUMN announcements.expires_at IS 'When to stop showing (null = never)';

-- ============================================================
-- SEED DATA (Optional - one example announcement)
-- ============================================================
-- INSERT INTO announcements (title, message, type, position, is_active)
-- VALUES (
--   'Welcome to Walla Walla Travel!',
--   'Book your wine country tour today and discover the magic of Walla Walla Valley.',
--   'info',
--   'homepage',
--   false
-- );
