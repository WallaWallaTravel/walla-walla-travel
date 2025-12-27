-- Migration: Add Media Framework
-- Date: November 1, 2025
-- Purpose: Create media library system for proposals and client portal

-- ============================================
-- 1. MEDIA LIBRARY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS media_library (
  id SERIAL PRIMARY KEY,
  
  -- File Information
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL UNIQUE,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('image', 'video')),
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  
  -- Categorization
  category VARCHAR(100) NOT NULL, -- 'winery', 'service', 'vehicle', 'location', 'brand'
  subcategory VARCHAR(100), -- Specific winery name, service type, etc.
  
  -- Metadata
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(255),
  photographer VARCHAR(255),
  copyright_info VARCHAR(255),
  
  -- Tags for smart matching
  tags TEXT[] DEFAULT '{}',
  
  -- Usage tracking
  is_hero BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  
  -- SEO
  seo_keywords TEXT[] DEFAULT '{}',
  
  -- Optimized versions (for images)
  thumbnail_path VARCHAR(500),
  medium_path VARCHAR(500),
  large_path VARCHAR(500),
  webp_path VARCHAR(500),
  
  -- Video specific
  video_duration INTEGER, -- in seconds
  video_thumbnail_path VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_media_category ON media_library(category);
CREATE INDEX idx_media_subcategory ON media_library(subcategory);
CREATE INDEX idx_media_tags ON media_library USING GIN(tags);
CREATE INDEX idx_media_active ON media_library(is_active);
CREATE INDEX idx_media_hero ON media_library(is_hero);
CREATE INDEX idx_media_file_type ON media_library(file_type);

-- Comments
COMMENT ON TABLE media_library IS 'Central repository for all media (photos, videos) used in proposals and client portal';
COMMENT ON COLUMN media_library.tags IS 'Array of tags for smart matching (e.g., ["wine", "tasting", "outdoor"])';
COMMENT ON COLUMN media_library.is_hero IS 'Whether this is a featured/hero image for its category';

-- ============================================
-- 2. WINERY MEDIA LINKING
-- ============================================
CREATE TABLE IF NOT EXISTS winery_media (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER NOT NULL REFERENCES wineries(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  section VARCHAR(100) DEFAULT 'gallery', -- 'hero', 'gallery', 'tasting_room', 'vineyard', 'bottles'
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(winery_id, media_id)
);

CREATE INDEX idx_winery_media_winery ON winery_media(winery_id);
CREATE INDEX idx_winery_media_media ON winery_media(media_id);
CREATE INDEX idx_winery_media_primary ON winery_media(is_primary);

COMMENT ON TABLE winery_media IS 'Links wineries to their photos/videos';

-- ============================================
-- 3. PROPOSAL MEDIA LINKING
-- ============================================
CREATE TABLE IF NOT EXISTS proposal_media (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  section VARCHAR(100) NOT NULL, -- 'hero', 'gallery', 'service_1', 'service_2', etc.
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(proposal_id, media_id, section)
);

CREATE INDEX idx_proposal_media_proposal ON proposal_media(proposal_id);
CREATE INDEX idx_proposal_media_media ON proposal_media(media_id);
CREATE INDEX idx_proposal_media_section ON proposal_media(section);

COMMENT ON TABLE proposal_media IS 'Links proposals to custom media selections';

-- ============================================
-- 4. SERVICE TYPE MEDIA (for auto-linking)
-- ============================================
CREATE TABLE IF NOT EXISTS service_type_media (
  id SERIAL PRIMARY KEY,
  service_type VARCHAR(100) NOT NULL, -- 'wine_tour', 'transfer', 'airport_transfer', 'wait_time'
  media_id INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(service_type, media_id)
);

CREATE INDEX idx_service_type_media_type ON service_type_media(service_type);
CREATE INDEX idx_service_type_media_default ON service_type_media(is_default);

COMMENT ON TABLE service_type_media IS 'Default media for each service type (for auto-suggestions)';

-- ============================================
-- 5. VEHICLE MEDIA LINKING
-- ============================================
CREATE TABLE IF NOT EXISTS vehicle_media (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  view_type VARCHAR(50) DEFAULT 'exterior', -- 'exterior', 'interior', 'detail'
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(vehicle_id, media_id)
);

CREATE INDEX idx_vehicle_media_vehicle ON vehicle_media(vehicle_id);
CREATE INDEX idx_vehicle_media_primary ON vehicle_media(is_primary);

COMMENT ON TABLE vehicle_media IS 'Links vehicles to their photos';

-- ============================================
-- 6. UPDATE PROPOSALS TABLE
-- ============================================
ALTER TABLE proposals 
  ADD COLUMN IF NOT EXISTS hero_media_id INTEGER REFERENCES media_library(id),
  ADD COLUMN IF NOT EXISTS auto_suggest_media BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN proposals.hero_media_id IS 'Primary hero image/video for proposal';
COMMENT ON COLUMN proposals.auto_suggest_media IS 'Whether to auto-suggest media based on services/wineries';

-- ============================================
-- 7. MEDIA USAGE TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS media_usage_log (
  id SERIAL PRIMARY KEY,
  media_id INTEGER NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  used_in VARCHAR(100) NOT NULL, -- 'proposal', 'itinerary', 'email', 'website'
  entity_id INTEGER, -- ID of proposal, booking, etc.
  viewed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_usage_media ON media_usage_log(media_id);
CREATE INDEX idx_media_usage_type ON media_usage_log(used_in);

COMMENT ON TABLE media_usage_log IS 'Track where and how often media is used';

-- ============================================
-- 8. SEED DEFAULT MEDIA CATEGORIES
-- ============================================

-- Insert placeholder entries for media categories
-- (In production, these would be actual uploaded files)

INSERT INTO media_library (file_name, file_path, file_type, category, subcategory, title, description, alt_text, is_hero, tags) VALUES
  -- Brand/Hero Images
  ('walla-walla-hero.jpg', '/media/brand/walla-walla-hero.jpg', 'image', 'brand', 'hero', 'Walla Walla Wine Country', 'Stunning aerial view of Walla Walla vineyards at sunset', 'Aerial view of Walla Walla vineyards', TRUE, ARRAY['walla-walla', 'vineyards', 'sunset', 'aerial']),
  ('company-logo.png', '/media/brand/logo.png', 'image', 'brand', 'logo', 'Company Logo', 'Official company logo', 'Walla Walla Travel logo', FALSE, ARRAY['logo', 'brand']),
  
  -- Service Type Images
  ('wine-tour-hero.jpg', '/media/services/wine-tours/hero.jpg', 'image', 'service', 'wine_tour', 'Wine Tour Experience', 'Guests enjoying wine tasting', 'Group wine tasting at winery', TRUE, ARRAY['wine', 'tour', 'tasting', 'group']),
  ('mercedes-sprinter.jpg', '/media/vehicles/sprinter-exterior.jpg', 'image', 'service', 'transfer', 'Mercedes Sprinter Van', 'Luxury Mercedes Sprinter', 'White Mercedes Sprinter van', TRUE, ARRAY['vehicle', 'sprinter', 'luxury', 'transfer']),
  ('airport-transfer.jpg', '/media/services/airport-transfers/hero.jpg', 'image', 'service', 'airport_transfer', 'Airport Transfer Service', 'Comfortable airport transfers', 'Luxury van at airport', TRUE, ARRAY['airport', 'transfer', 'travel']),
  
  -- Location Images
  ('downtown-walla-walla.jpg', '/media/locations/walla-walla/downtown.jpg', 'image', 'location', 'walla-walla', 'Downtown Walla Walla', 'Historic downtown area', 'Downtown Walla Walla street view', FALSE, ARRAY['downtown', 'walla-walla', 'historic']),
  ('vineyard-rows.jpg', '/media/locations/walla-walla/vineyard-rows.jpg', 'image', 'location', 'walla-walla', 'Vineyard Rows', 'Beautiful vineyard rows', 'Rows of grapevines in Walla Walla', FALSE, ARRAY['vineyard', 'grapes', 'agriculture'])
ON CONFLICT (file_path) DO NOTHING;

-- Link default service media
INSERT INTO service_type_media (service_type, media_id, is_default) 
SELECT 'wine_tour', id, TRUE FROM media_library WHERE subcategory = 'wine_tour' AND is_hero = TRUE
ON CONFLICT DO NOTHING;

INSERT INTO service_type_media (service_type, media_id, is_default) 
SELECT 'transfer', id, TRUE FROM media_library WHERE subcategory = 'transfer' AND is_hero = TRUE
ON CONFLICT DO NOTHING;

INSERT INTO service_type_media (service_type, media_id, is_default) 
SELECT 'airport_transfer', id, TRUE FROM media_library WHERE subcategory = 'airport_transfer' AND is_hero = TRUE
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. FUNCTIONS FOR MEDIA MANAGEMENT
-- ============================================

-- Function to get media for a winery
CREATE OR REPLACE FUNCTION get_winery_media(winery_id_param INTEGER)
RETURNS TABLE (
  media_id INTEGER,
  file_path VARCHAR,
  title VARCHAR,
  section VARCHAR,
  is_primary BOOLEAN,
  display_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.file_path,
    m.title,
    wm.section,
    wm.is_primary,
    wm.display_order
  FROM media_library m
  JOIN winery_media wm ON m.id = wm.media_id
  WHERE wm.winery_id = winery_id_param
    AND m.is_active = TRUE
  ORDER BY wm.is_primary DESC, wm.display_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to suggest media for a service type
CREATE OR REPLACE FUNCTION suggest_service_media(service_type_param VARCHAR)
RETURNS TABLE (
  media_id INTEGER,
  file_path VARCHAR,
  title VARCHAR,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.file_path,
    m.title,
    stm.is_default
  FROM media_library m
  JOIN service_type_media stm ON m.id = stm.media_id
  WHERE stm.service_type = service_type_param
    AND m.is_active = TRUE
  ORDER BY stm.is_default DESC, stm.display_order ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_media_views(media_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE media_library 
  SET view_count = view_count + 1 
  WHERE id = media_id_param;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Update timestamp on media_library changes
CREATE OR REPLACE FUNCTION update_media_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER media_library_update_timestamp
BEFORE UPDATE ON media_library
FOR EACH ROW
EXECUTE FUNCTION update_media_timestamp();

-- ============================================
-- Migration Complete!
-- ============================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Media Framework Migration Complete!';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - media_library';
  RAISE NOTICE '  - winery_media';
  RAISE NOTICE '  - proposal_media';
  RAISE NOTICE '  - service_type_media';
  RAISE NOTICE '  - vehicle_media';
  RAISE NOTICE '  - media_usage_log';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - get_winery_media()';
  RAISE NOTICE '  - suggest_service_media()';
  RAISE NOTICE '  - increment_media_views()';
END $$;

