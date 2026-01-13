-- ============================================================================
-- Geology Education Feature - Database Schema
-- ============================================================================
-- Enables the geology education section with:
-- - Topics/articles for educational content
-- - Quick facts for shareable highlights
-- - Physical sites visitors can explore
-- - Media library for photos/videos/diagrams
-- - AI guidance for the geologist to train the AI
-- - Bookable geology tours
-- ============================================================================

-- ============================================================================
-- GEOLOGY_TOPICS TABLE - Main educational articles
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_topics (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(150) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(500),

  -- Content
  content TEXT NOT NULL,           -- Full article (markdown supported)
  excerpt VARCHAR(500),            -- For cards/previews

  -- Classification
  topic_type VARCHAR(50) NOT NULL CHECK (
    topic_type IN ('ice_age_floods', 'soil_types', 'basalt', 'terroir', 'climate', 'water', 'overview', 'wine_connection')
  ),
  difficulty VARCHAR(20) DEFAULT 'general' CHECK (
    difficulty IN ('general', 'intermediate', 'advanced')
  ),

  -- Display
  hero_image_url VARCHAR(500),
  display_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,

  -- Connections (arrays of IDs for flexibility)
  related_winery_ids INTEGER[],    -- Links to wineries affected by this geology
  related_topic_ids INTEGER[],     -- Links to related topics

  -- Provenance (critical for accuracy)
  author_name VARCHAR(255),        -- The geologist's name
  sources TEXT,                    -- Bibliography/citations
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_topics
CREATE INDEX IF NOT EXISTS idx_geology_topics_slug ON geology_topics(slug);
CREATE INDEX IF NOT EXISTS idx_geology_topics_type ON geology_topics(topic_type);
CREATE INDEX IF NOT EXISTS idx_geology_topics_published ON geology_topics(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_topics_featured ON geology_topics(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_topics_display_order ON geology_topics(display_order);

-- ============================================================================
-- GEOLOGY_FACTS TABLE - Quick, shareable facts
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_facts (
  id SERIAL PRIMARY KEY,
  fact_text TEXT NOT NULL,         -- The quick fact
  context TEXT,                    -- Optional longer explanation

  -- Classification
  fact_type VARCHAR(50) CHECK (
    fact_type IN ('statistic', 'comparison', 'quote', 'timeline', 'mind_blowing', 'wine_connection')
  ),

  -- Connection to topic (optional)
  topic_id INTEGER REFERENCES geology_topics(id) ON DELETE SET NULL,

  -- Display
  display_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_facts
CREATE INDEX IF NOT EXISTS idx_geology_facts_topic ON geology_facts(topic_id);
CREATE INDEX IF NOT EXISTS idx_geology_facts_featured ON geology_facts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_facts_type ON geology_facts(fact_type);

-- ============================================================================
-- GEOLOGY_SITES TABLE - Physical locations to visit
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,

  -- Classification
  site_type VARCHAR(50) CHECK (
    site_type IN ('viewpoint', 'formation', 'vineyard_example', 'educational_marker', 'museum', 'tour_stop')
  ),

  -- Location
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address VARCHAR(500),
  directions TEXT,                 -- How to get there

  -- Accessibility
  is_public_access BOOLEAN DEFAULT TRUE,
  requires_appointment BOOLEAN DEFAULT FALSE,
  best_time_to_visit VARCHAR(255),
  accessibility_notes TEXT,

  -- Media (array of photo URLs)
  photos JSONB DEFAULT '[]'::jsonb,

  -- Connections
  related_topic_ids INTEGER[],
  nearby_winery_ids INTEGER[],

  -- Status
  is_published BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_sites
CREATE INDEX IF NOT EXISTS idx_geology_sites_slug ON geology_sites(slug);
CREATE INDEX IF NOT EXISTS idx_geology_sites_type ON geology_sites(site_type);
CREATE INDEX IF NOT EXISTS idx_geology_sites_published ON geology_sites(is_published) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_sites_location ON geology_sites(latitude, longitude) WHERE latitude IS NOT NULL;

-- ============================================================================
-- GEOLOGY_MEDIA TABLE - Rich media library
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_media (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Media type
  media_type VARCHAR(50) NOT NULL CHECK (
    media_type IN ('photo', 'video', 'diagram', 'map', 'before_after', 'timeline_graphic', '3d_model')
  ),

  -- Storage
  url VARCHAR(500) NOT NULL,       -- Direct URL or embed code
  thumbnail_url VARCHAR(500),
  file_size_bytes INTEGER,

  -- Metadata
  alt_text VARCHAR(500),           -- Accessibility
  credit VARCHAR(255),             -- Attribution
  caption TEXT,

  -- Connections
  topic_ids INTEGER[],             -- Which topics use this media
  site_ids INTEGER[],              -- Which sites this shows

  -- Display
  is_featured BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_media
CREATE INDEX IF NOT EXISTS idx_geology_media_type ON geology_media(media_type);
CREATE INDEX IF NOT EXISTS idx_geology_media_featured ON geology_media(is_featured) WHERE is_featured = TRUE;

-- ============================================================================
-- GEOLOGY_AI_GUIDANCE TABLE - Geologist's instructions for AI
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_ai_guidance (
  id SERIAL PRIMARY KEY,

  -- Guidance type
  guidance_type VARCHAR(50) NOT NULL CHECK (
    guidance_type IN ('personality', 'key_themes', 'common_questions', 'corrections', 'connections', 'terminology', 'emphasis')
  ),

  -- Content
  title VARCHAR(255),
  content TEXT NOT NULL,           -- The actual guidance/instructions

  -- Priority (higher = more important to include in AI context)
  priority INT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_ai_guidance
CREATE INDEX IF NOT EXISTS idx_geology_ai_guidance_type ON geology_ai_guidance(guidance_type);
CREATE INDEX IF NOT EXISTS idx_geology_ai_guidance_active ON geology_ai_guidance(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_ai_guidance_priority ON geology_ai_guidance(priority DESC);

-- ============================================================================
-- GEOLOGY_TOURS TABLE - Bookable geology experiences
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_tours (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  tagline VARCHAR(255),
  description TEXT NOT NULL,

  -- Logistics
  duration_hours DECIMAL(3,1),
  group_size_min INT DEFAULT 2,
  group_size_max INT DEFAULT 12,
  price_per_person DECIMAL(10,2),
  private_tour_price DECIMAL(10,2),

  -- Schedule (arrays for flexibility)
  available_days VARCHAR(50)[],    -- ['monday', 'tuesday', ...]
  start_times VARCHAR(10)[],       -- ['10:00', '14:00']
  seasonal_availability VARCHAR(100),

  -- Content (arrays for lists)
  what_included TEXT[],
  what_to_bring TEXT[],
  highlights TEXT[],

  -- Connections
  site_ids INTEGER[],              -- Geological sites visited
  partner_winery_ids INTEGER[],    -- Wine stops included

  -- Display
  hero_image_url VARCHAR(500),
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  -- Contact/Booking
  booking_url VARCHAR(500),
  booking_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_tours
CREATE INDEX IF NOT EXISTS idx_geology_tours_slug ON geology_tours(slug);
CREATE INDEX IF NOT EXISTS idx_geology_tours_active ON geology_tours(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_geology_tours_featured ON geology_tours(is_featured) WHERE is_featured = TRUE;

-- ============================================================================
-- GEOLOGY_CHAT_MESSAGES TABLE - Chat history for AI interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS geology_chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,  -- Browser session identifier

  -- Message
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,

  -- Context (what topic/page was the user on)
  context_topic_id INTEGER REFERENCES geology_topics(id) ON DELETE SET NULL,
  context_site_id INTEGER REFERENCES geology_sites(id) ON DELETE SET NULL,

  -- Metadata
  ip_hash VARCHAR(64),             -- For rate limiting (hashed for privacy)

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for geology_chat_messages
CREATE INDEX IF NOT EXISTS idx_geology_chat_session ON geology_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_geology_chat_created ON geology_chat_messages(created_at DESC);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Update geology_topics.updated_at on change
CREATE OR REPLACE FUNCTION update_geology_topics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS geology_topics_updated_at ON geology_topics;
CREATE TRIGGER geology_topics_updated_at
  BEFORE UPDATE ON geology_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_geology_topics_timestamp();

-- Update geology_sites.updated_at on change
CREATE OR REPLACE FUNCTION update_geology_sites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS geology_sites_updated_at ON geology_sites;
CREATE TRIGGER geology_sites_updated_at
  BEFORE UPDATE ON geology_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_geology_sites_timestamp();

-- Update geology_ai_guidance.updated_at on change
CREATE OR REPLACE FUNCTION update_geology_ai_guidance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS geology_ai_guidance_updated_at ON geology_ai_guidance;
CREATE TRIGGER geology_ai_guidance_updated_at
  BEFORE UPDATE ON geology_ai_guidance
  FOR EACH ROW
  EXECUTE FUNCTION update_geology_ai_guidance_timestamp();

-- Update geology_tours.updated_at on change
CREATE OR REPLACE FUNCTION update_geology_tours_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS geology_tours_updated_at ON geology_tours;
CREATE TRIGGER geology_tours_updated_at
  BEFORE UPDATE ON geology_tours
  FOR EACH ROW
  EXECUTE FUNCTION update_geology_tours_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE geology_topics IS 'Educational articles about Walla Walla geology written by expert geologist';
COMMENT ON TABLE geology_facts IS 'Quick, shareable facts and statistics about local geology';
COMMENT ON TABLE geology_sites IS 'Physical geological locations visitors can explore';
COMMENT ON TABLE geology_media IS 'Photos, videos, diagrams, and maps for geology content';
COMMENT ON TABLE geology_ai_guidance IS 'Geologist instructions for training the AI geology guide';
COMMENT ON TABLE geology_tours IS 'Bookable geology tour experiences';
COMMENT ON TABLE geology_chat_messages IS 'Chat history for AI geology guide conversations';

COMMENT ON COLUMN geology_topics.topic_type IS 'Category: ice_age_floods, soil_types, basalt, terroir, climate, water, overview, wine_connection';
COMMENT ON COLUMN geology_topics.sources IS 'Bibliography and citations for accuracy verification';
COMMENT ON COLUMN geology_ai_guidance.priority IS 'Higher values are more important to include in AI context';
COMMENT ON COLUMN geology_chat_messages.session_id IS 'Anonymous session identifier for conversation continuity';
