-- Migration: 063-content-cms.sql
-- Description: Content Management System for static page content and collections
-- Date: 2025-02-02
--
-- This migration creates tables for managing website content through an admin UI:
-- - page_content: Editable sections on static pages (homepage, about, terms, etc.)
-- - content_collections: Collection-type content (neighborhoods, guides, itineraries)

BEGIN;

-- ============================================================================
-- PAGE CONTENT TABLE
-- Stores editable content sections for static pages
-- ============================================================================

CREATE TABLE IF NOT EXISTS page_content (
  id SERIAL PRIMARY KEY,
  page_slug VARCHAR(100) NOT NULL,        -- 'homepage', 'about', 'terms', etc.
  section_key VARCHAR(100) NOT NULL,      -- 'hero_headline', 'stats_wineries', etc.
  content_type VARCHAR(50) DEFAULT 'text', -- 'text', 'html', 'json', 'number'
  content TEXT NOT NULL,                   -- The actual content
  metadata JSONB DEFAULT '{}',             -- Additional metadata (e.g., character limits, notes)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(page_slug, section_key)
);

-- Index for quick lookups by page
CREATE INDEX IF NOT EXISTS idx_page_content_page_slug ON page_content(page_slug);

-- Comment on table
COMMENT ON TABLE page_content IS 'Stores editable content sections for static website pages';
COMMENT ON COLUMN page_content.page_slug IS 'Identifies the page (e.g., homepage, about, terms)';
COMMENT ON COLUMN page_content.section_key IS 'Identifies the content section within the page';
COMMENT ON COLUMN page_content.content_type IS 'Type of content: text, html, json, or number';
COMMENT ON COLUMN page_content.metadata IS 'Additional metadata like character limits or editorial notes';


-- ============================================================================
-- CONTENT COLLECTIONS TABLE
-- Stores collection-type content (neighborhoods, guides, itineraries, best-of)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_collections (
  id SERIAL PRIMARY KEY,
  collection_type VARCHAR(50) NOT NULL,   -- 'neighborhoods', 'guides', 'itineraries', 'best-of'
  slug VARCHAR(100) NOT NULL,             -- URL-friendly identifier
  title VARCHAR(255) NOT NULL,            -- Display title
  subtitle VARCHAR(255),                  -- Optional subtitle
  description TEXT,                       -- Long description (supports HTML)
  content JSONB NOT NULL DEFAULT '{}',    -- Flexible content structure
  image_url VARCHAR(500),                 -- Featured image
  icon VARCHAR(100),                      -- Icon identifier (for UI)
  sort_order INTEGER DEFAULT 0,           -- Display order
  is_active BOOLEAN DEFAULT true,         -- Soft enable/disable
  metadata JSONB DEFAULT '{}',            -- Additional flexible data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(collection_type, slug)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_content_collections_type ON content_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_content_collections_active ON content_collections(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_collections_sort ON content_collections(collection_type, sort_order);

-- Comment on table
COMMENT ON TABLE content_collections IS 'Stores collection-type content like neighborhoods, guides, and itineraries';
COMMENT ON COLUMN content_collections.collection_type IS 'Type of collection: neighborhoods, guides, itineraries, best-of';
COMMENT ON COLUMN content_collections.content IS 'Flexible JSONB structure for collection-specific data';


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- Automatically update the updated_at timestamp
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for page_content
DROP TRIGGER IF EXISTS update_page_content_updated_at ON page_content;
CREATE TRIGGER update_page_content_updated_at
  BEFORE UPDATE ON page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for content_collections
DROP TRIGGER IF EXISTS update_content_collections_updated_at ON content_collections;
CREATE TRIGGER update_content_collections_updated_at
  BEFORE UPDATE ON content_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- CONTENT HISTORY TABLE (Optional - for audit trail)
-- Tracks changes to content for rollback capability
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_history (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,        -- 'page_content' or 'content_collections'
  record_id INTEGER NOT NULL,             -- ID of the changed record
  field_name VARCHAR(100) NOT NULL,       -- Which field changed
  old_value TEXT,                         -- Previous value
  new_value TEXT,                         -- New value
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index for looking up history by record
CREATE INDEX IF NOT EXISTS idx_content_history_record ON content_history(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_content_history_changed_at ON content_history(changed_at DESC);

COMMENT ON TABLE content_history IS 'Audit trail for content changes, enables rollback';


-- ============================================================================
-- SEED INITIAL PAGE CONTENT
-- Pre-populate with current hardcoded values for easy editing
-- ============================================================================

-- Homepage content
INSERT INTO page_content (page_slug, section_key, content_type, content, metadata) VALUES
  ('homepage', 'hero_headline', 'text', 'Your Guide to Walla Walla Wine Country', '{"maxLength": 60}'),
  ('homepage', 'hero_subheadline', 'text', '120+ wineries. Personalized recommendations. Unforgettable experiences.', '{"maxLength": 120}'),
  ('homepage', 'stats_wineries', 'number', '120', '{"label": "Wineries", "suffix": "+"}'),
  ('homepage', 'stats_districts', 'number', '6', '{"label": "Wine Districts"}'),
  ('homepage', 'stats_varietals', 'number', '40', '{"label": "Varietals", "suffix": "+"}'),
  ('homepage', 'stats_experience', 'number', '25', '{"label": "Years of Wine History", "suffix": "+"}')
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- About page content
INSERT INTO page_content (page_slug, section_key, content_type, content, metadata) VALUES
  ('about', 'intro_title', 'text', 'Your Local Guide to Walla Walla Wine Country', '{}'),
  ('about', 'intro_paragraph', 'html', 'We''re not just another travel website. We''re your neighbors, your friends, and your personal guides to everything that makes Walla Walla special.', '{}'),
  ('about', 'mission_statement', 'html', 'To help visitors discover the authentic Walla Walla wine country experience through expert local knowledge and genuine hospitality.', '{}')
ON CONFLICT (page_slug, section_key) DO NOTHING;


-- ============================================================================
-- SEED INITIAL COLLECTIONS
-- Pre-populate neighborhoods from lib/data/neighborhoods.ts
-- ============================================================================

INSERT INTO content_collections (collection_type, slug, title, subtitle, description, content, sort_order) VALUES
  ('neighborhoods', 'downtown', 'Downtown', 'Urban Wine District',
   'The heart of Walla Walla wine tasting, with over 30 tasting rooms within walking distance.',
   '{"highlights": ["Walk to 30+ tasting rooms", "Historic architecture", "World-class restaurants", "Local shops and galleries"], "wineryCount": 30}',
   1),
  ('neighborhoods', 'airport', 'Airport District', 'Pioneer Wine Territory',
   'Where it all began. Home to legendary wineries including L''Ecole No 41, Woodward Canyon, and Pepper Bridge.',
   '{"highlights": ["Historic wineries", "Scenic vineyard views", "Intimate tasting experiences", "Rich winemaking heritage"], "wineryCount": 15}',
   2),
  ('neighborhoods', 'southside', 'Southside', 'Artisan Wine Country',
   'A diverse collection of boutique wineries showcasing innovative winemaking and unique varietals.',
   '{"highlights": ["Boutique producers", "Innovative wines", "Relaxed atmosphere", "Hidden gems"], "wineryCount": 20}',
   3),
  ('neighborhoods', 'westside', 'Westside', 'Scenic Wine Route',
   'Stunning views and exceptional wines along the western edge of the valley.',
   '{"highlights": ["Mountain views", "Award-winning estates", "Picnic-friendly grounds", "Photography opportunities"], "wineryCount": 12}',
   4),
  ('neighborhoods', 'rocks-district', 'The Rocks District', 'AVA Excellence',
   'America''s first AVA based on soil type. Known for distinctive wines shaped by ancient river cobbles.',
   '{"highlights": ["Unique terroir", "Syrah excellence", "Geologic significance", "Premium estates"], "wineryCount": 10}',
   5),
  ('neighborhoods', 'sevein', 'SeVein', 'Seven Hills Excellence',
   'Premium wineries in the Seven Hills area, known for exceptional Cabernet Sauvignon and Merlot.',
   '{"highlights": ["Premium Cabernet", "Established vineyards", "Elegant estates", "Stunning landscapes"], "wineryCount": 8}',
   6)
ON CONFLICT (collection_type, slug) DO NOTHING;


-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================

INSERT INTO _migrations (name, checksum, applied_at)
VALUES ('063-content-cms', md5('063-content-cms.sql'), NOW())
ON CONFLICT (name) DO NOTHING;

COMMIT;
