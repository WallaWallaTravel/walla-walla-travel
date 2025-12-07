-- Wine Directory & AI-Ready Content Schema
-- Comprehensive wine database for RAG/LLM-powered directory

-- ============================================
-- ENABLE VECTOR EXTENSION (for embeddings)
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- WINERIES
-- ============================================
CREATE TABLE IF NOT EXISTS wineries (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  
  -- Location
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(50) DEFAULT 'WA',
  zip VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- AVA (American Viticultural Area)
  ava VARCHAR(100),                           -- 'Walla Walla Valley', 'The Rocks District', etc.
  
  -- Tasting Room
  tasting_room_fee DECIMAL(10,2),
  tasting_room_waived_with_purchase BOOLEAN DEFAULT TRUE,
  reservation_required BOOLEAN DEFAULT FALSE,
  walk_ins_welcome BOOLEAN DEFAULT TRUE,
  
  -- Hours (JSONB for flexibility)
  hours JSONB,                                -- {"mon": "11:00-17:00", "tue": "11:00-17:00", ...}
  seasonal_hours_notes TEXT,
  
  -- Features
  amenities TEXT[],                           -- ['picnic_area', 'food_available', 'dog_friendly', 'wheelchair_accessible']
  
  -- Media
  logo_url VARCHAR(500),
  hero_image_url VARCHAR(500),
  gallery_urls TEXT[],
  
  -- Metadata
  founded_year INTEGER,
  annual_production_cases INTEGER,
  vineyard_acres DECIMAL(10,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- For RAG: Main embedding of winery profile
  embedding vector(1536)
);

-- ============================================
-- WINERY CONTENT CHUNKS (For RAG)
-- Rich narrative content broken into searchable chunks
-- ============================================
CREATE TABLE IF NOT EXISTS winery_content (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  -- Content Type
  content_type VARCHAR(50) NOT NULL,          -- 'backstory', 'philosophy', 'winemaker_bio', 'tasting_notes', 'visitor_tips', 'signature_experience'
  
  -- The actual content
  title VARCHAR(255),
  content TEXT NOT NULL,
  
  -- Metadata for filtering
  metadata JSONB,                             -- {"season": "summer", "author": "winemaker", etc.}
  
  -- For RAG
  embedding vector(1536),
  
  -- Timestamps
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
  vintage INTEGER,                            -- NULL for NV wines
  slug VARCHAR(150),
  
  -- Status
  status VARCHAR(50) DEFAULT 'current_release',  -- 'current_release', 'library', 'sold_out', 'upcoming', 'archive'
  is_club_exclusive BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- THE GRAPE
  varietals JSONB,                            -- [{"name": "Cabernet Sauvignon", "percentage": 85}, {"name": "Merlot", "percentage": 15}]
  vineyard_sources JSONB,                     -- [{"name": "Seven Hills", "percentage": 60, "ava": "Walla Walla Valley"}]
  ava VARCHAR(100),
  elevation_feet INTEGER,
  soil_type VARCHAR(255),
  vine_age_years INTEGER,
  yield_tons_per_acre DECIMAL(4,2),
  
  -- THE CRAFT
  harvest_date DATE,
  harvest_method VARCHAR(50),                 -- 'hand_picked', 'machine'
  fermentation_vessel VARCHAR(100),           -- 'stainless_steel', 'french_oak', 'concrete_egg'
  fermentation_days INTEGER,
  malolactic BOOLEAN,
  oak_treatment JSONB,                        -- {"type": "french", "new_percentage": 40, "months": 18}
  aging_months INTEGER,
  bottling_date DATE,
  cases_produced INTEGER,
  
  -- THE EXPERIENCE
  official_tasting_notes TEXT,
  aroma_profile JSONB,                        -- {"primary": ["blackberry", "cassis"], "secondary": ["vanilla", "tobacco"], "tertiary": ["leather"]}
  palate_profile JSONB,                       -- {"body": "full", "tannin": "medium-high", "acidity": "medium", "finish": "long"}
  food_pairings TEXT[],
  serving_temp_f_low INTEGER,
  serving_temp_f_high INTEGER,
  decant_time_minutes INTEGER,
  drink_window_start INTEGER,                 -- Year
  drink_window_end INTEGER,
  aging_potential VARCHAR(100),               -- 'drink now', '5-10 years', '10-20 years'
  
  -- THE DETAILS
  alcohol_pct DECIMAL(4,2),
  ph DECIMAL(3,2),
  ta DECIMAL(4,2),                            -- Total Acidity (g/L)
  rs DECIMAL(5,2),                            -- Residual Sugar (g/L)
  
  -- Pricing
  price DECIMAL(10,2),
  club_price DECIMAL(10,2),
  
  -- Recognition
  awards JSONB,                               -- [{"award": "Gold Medal", "competition": "SF Chronicle", "year": 2024}]
  ratings JSONB,                              -- [{"publication": "Wine Advocate", "score": 94, "reviewer": "Jeb Dunnuck"}]
  
  -- THE STORY
  vintage_story TEXT,                         -- What made this vintage special
  winemaker_notes TEXT,                       -- Personal perspective
  label_story TEXT,                           -- Meaning behind the label
  
  -- Media
  bottle_image_url VARCHAR(500),
  label_image_url VARCHAR(500),
  
  -- For RAG
  embedding vector(1536),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique per winery + name + vintage
  UNIQUE(winery_id, name, vintage)
);

-- ============================================
-- WINERY OWNERS/WINEMAKERS
-- ============================================
CREATE TABLE IF NOT EXISTS winery_people (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL,                 -- 'owner', 'winemaker', 'tasting_room_manager'
  
  bio TEXT,
  photo_url VARCHAR(500),
  
  -- Contact (optional)
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
  
  category VARCHAR(100),                      -- 'visiting', 'wines', 'history', 'general'
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BUSINESS DIRECTORY (General businesses)
-- ============================================
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  
  -- Category
  category VARCHAR(50) NOT NULL,              -- 'restaurant', 'lodging', 'activity', 'shopping', 'service'
  subcategory VARCHAR(100),                   -- 'fine_dining', 'casual', 'farm_to_table'
  
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  
  -- Location
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100) DEFAULT 'Walla Walla',
  state VARCHAR(50) DEFAULT 'WA',
  zip VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Hours
  hours JSONB,
  
  -- Features
  amenities TEXT[],
  price_range VARCHAR(10),                    -- '$', '$$', '$$$', '$$$$'
  
  -- Media
  logo_url VARCHAR(500),
  hero_image_url VARCHAR(500),
  gallery_urls TEXT[],
  
  -- Content for AI
  description TEXT,
  
  -- For RAG
  embedding vector(1536),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- BUSINESS CONTENT (For RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS business_content (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  
  content_type VARCHAR(50) NOT NULL,          -- 'backstory', 'specialties', 'chef_bio', 'insider_tips'
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
  source VARCHAR(50) NOT NULL,                -- 'manual', 'scraped', 'submitted'
  source_url VARCHAR(500),
  source_id VARCHAR(100),                     -- ID from source for dedup
  
  -- Basic Info
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(200),
  description TEXT,
  
  -- Categorization (AI-assisted)
  category VARCHAR(100),                      -- 'wine', 'music', 'food', 'art', 'community'
  tags TEXT[],
  
  -- Timing
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule VARCHAR(255),               -- iCal RRULE format
  
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
  price_info VARCHAR(255),                    -- 'Free', '$25', '$50-100'
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
  
  -- Prevent duplicates from scraping
  UNIQUE(source, source_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wineries_slug ON wineries(slug);
CREATE INDEX IF NOT EXISTS idx_wineries_ava ON wineries(ava);
CREATE INDEX IF NOT EXISTS idx_wineries_active ON wineries(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_wineries_featured ON wineries(is_featured) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_wines_winery ON wines(winery_id);
CREATE INDEX IF NOT EXISTS idx_wines_vintage ON wines(vintage);
CREATE INDEX IF NOT EXISTS idx_wines_status ON wines(status);

CREATE INDEX IF NOT EXISTS idx_winery_content_winery ON winery_content(winery_id);
CREATE INDEX IF NOT EXISTS idx_winery_content_type ON winery_content(content_type);

CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active) WHERE is_active = TRUE;

-- Vector indexes for semantic search (using IVFFlat for performance)
-- Note: These require data to exist first, run after seeding
-- CREATE INDEX ON wineries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX ON wines USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX ON winery_content USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- CREATE INDEX ON events USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

