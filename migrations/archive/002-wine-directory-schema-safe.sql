-- Wine Directory Enhancement Schema (SAFE VERSION)
-- Adds AI-ready features to existing wineries table
-- Creates new supporting tables for rich content

-- ============================================
-- ENABLE VECTOR EXTENSION (for embeddings)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ENHANCE EXISTING WINERIES TABLE
-- ============================================
DO $$
BEGIN
  -- Add AVA column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wineries' AND column_name = 'ava') THEN
    ALTER TABLE wineries ADD COLUMN ava VARCHAR(100);
  END IF;
  
  -- Add vector embedding column for AI search
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wineries' AND column_name = 'embedding') THEN
    ALTER TABLE wineries ADD COLUMN embedding vector(1536);
  END IF;
  
  -- Add walk_ins_welcome if missing (alias for accepts_walkins)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wineries' AND column_name = 'walk_ins_welcome') THEN
    ALTER TABLE wineries ADD COLUMN walk_ins_welcome BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add annual_production_cases if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wineries' AND column_name = 'annual_production_cases') THEN
    ALTER TABLE wineries ADD COLUMN annual_production_cases INTEGER;
  END IF;
  
  -- Add vineyard_acres if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wineries' AND column_name = 'vineyard_acres') THEN
    ALTER TABLE wineries ADD COLUMN vineyard_acres DECIMAL(10,2);
  END IF;
END $$;

-- ============================================
-- WINERY CONTENT CHUNKS (For RAG)
-- Rich narrative content broken into searchable chunks
-- ============================================
CREATE TABLE IF NOT EXISTS winery_content (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  -- Content Type
  content_type VARCHAR(50) NOT NULL,  -- 'backstory', 'philosophy', 'winemaker_bio', 'tasting_notes', 'visitor_tips', 'signature_experience'
  
  -- The actual content
  title VARCHAR(255),
  content TEXT NOT NULL,
  
  -- Metadata for filtering
  metadata JSONB,
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WINES
-- ============================================
CREATE TABLE IF NOT EXISTS wines (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  vintage INTEGER,
  slug VARCHAR(150),
  
  -- Status
  status VARCHAR(50) DEFAULT 'current_release',
  is_club_exclusive BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- THE GRAPE
  varietals JSONB,
  vineyard_sources JSONB,
  ava VARCHAR(100),
  elevation_feet INTEGER,
  soil_type VARCHAR(255),
  vine_age_years INTEGER,
  yield_tons_per_acre DECIMAL(4,2),
  
  -- THE CRAFT
  harvest_date DATE,
  harvest_method VARCHAR(50),
  fermentation_vessel VARCHAR(100),
  fermentation_days INTEGER,
  malolactic BOOLEAN,
  oak_treatment JSONB,
  aging_months INTEGER,
  bottling_date DATE,
  cases_produced INTEGER,
  
  -- THE EXPERIENCE
  official_tasting_notes TEXT,
  aroma_profile JSONB,
  palate_profile JSONB,
  food_pairings TEXT[],
  serving_temp_f_low INTEGER,
  serving_temp_f_high INTEGER,
  decant_time_minutes INTEGER,
  drink_window_start INTEGER,
  drink_window_end INTEGER,
  aging_potential VARCHAR(100),
  
  -- THE DETAILS
  alcohol_pct DECIMAL(4,2),
  ph DECIMAL(3,2),
  ta DECIMAL(4,2),
  rs DECIMAL(5,2),
  
  -- Pricing
  price DECIMAL(10,2),
  club_price DECIMAL(10,2),
  
  -- Recognition
  awards JSONB,
  ratings JSONB,
  
  -- THE STORY
  vintage_story TEXT,
  winemaker_notes TEXT,
  label_story TEXT,
  
  -- Media
  bottle_image_url VARCHAR(500),
  label_image_url VARCHAR(500),
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(winery_id, name, vintage)
);

-- ============================================
-- WINERY PEOPLE (Owners/Winemakers)
-- ============================================
CREATE TABLE IF NOT EXISTS winery_people (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,  -- 'owner', 'winemaker', 'tasting_room_manager'
  
  bio TEXT,
  photo_url VARCHAR(500),
  email VARCHAR(255),
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WINERY FAQ (Structured Q&A for AEO)
-- ============================================
CREATE TABLE IF NOT EXISTS winery_faqs (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  category VARCHAR(100),  -- 'visiting', 'wines', 'history', 'general'
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ENHANCE EXISTING BUSINESSES TABLE
-- ============================================
DO $$
BEGIN
  -- Add embedding column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'embedding') THEN
    ALTER TABLE businesses ADD COLUMN embedding vector(1536);
  END IF;
  
  -- Add price_range if missing  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'price_range') THEN
    ALTER TABLE businesses ADD COLUMN price_range VARCHAR(10);
  END IF;
END $$;

-- ============================================
-- BUSINESS CONTENT (For RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS business_content (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  
  content_type VARCHAR(50) NOT NULL,  -- 'backstory', 'specialties', 'chef_bio', 'insider_tips'
  title VARCHAR(255),
  content TEXT NOT NULL,
  
  metadata JSONB,
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  
  -- Source
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  source_url VARCHAR(500),
  source_id VARCHAR(100),
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(200),
  description TEXT,
  
  -- Categorization
  category VARCHAR(100),
  tags TEXT[],
  
  -- Timing
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),
  
  -- Location
  venue_name VARCHAR(255),
  address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_virtual BOOLEAN DEFAULT FALSE,
  virtual_url VARCHAR(500),
  
  -- Associated Business
  winery_id INTEGER REFERENCES wineries(id),
  business_id INTEGER REFERENCES businesses(id),
  
  -- Details
  price_info VARCHAR(255),
  ticket_url VARCHAR(500),
  
  -- Media
  image_url VARCHAR(500),
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(source, source_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wineries_ava ON wineries(ava);
CREATE INDEX IF NOT EXISTS idx_wineries_active ON wineries(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_wineries_featured ON wineries(is_featured) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_wines_winery ON wines(winery_id);
CREATE INDEX IF NOT EXISTS idx_wines_vintage ON wines(vintage);
CREATE INDEX IF NOT EXISTS idx_wines_status ON wines(status);

CREATE INDEX IF NOT EXISTS idx_winery_content_winery ON winery_content(winery_id);
CREATE INDEX IF NOT EXISTS idx_winery_content_type ON winery_content(content_type);

CREATE INDEX IF NOT EXISTS idx_winery_people_winery ON winery_people(winery_id);
CREATE INDEX IF NOT EXISTS idx_winery_faqs_winery ON winery_faqs(winery_id);

CREATE INDEX IF NOT EXISTS idx_business_content_business ON business_content(business_id);

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_winery ON events(winery_id);
CREATE INDEX IF NOT EXISTS idx_events_business ON events(business_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active) WHERE is_active = TRUE;

-- Note: Vector indexes should be created after data is seeded
-- CREATE INDEX ON wineries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX ON wines USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);




