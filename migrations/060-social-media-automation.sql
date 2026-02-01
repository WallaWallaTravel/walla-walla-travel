-- ============================================================================
-- Migration 060: Social Media Automation System
-- Description: Social accounts connection, post scheduling, content suggestions,
--              and Buffer integration for automated social media publishing
-- Created: 2026-01-31
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. CLEANUP PARTIAL RUNS (drop if exists to handle partial migrations)
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS content_suggestions CASCADE;
DROP TABLE IF EXISTS scheduled_posts CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;

-- ============================================================================
-- 1. SOCIAL ACCOUNTS (Connected social media accounts via Buffer)
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,

  -- Platform Info
  platform VARCHAR(50) NOT NULL
    CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'pinterest')),
  account_name VARCHAR(255),
  account_username VARCHAR(255),

  -- Buffer Integration
  buffer_profile_id VARCHAR(255),  -- Buffer's profile ID for this account
  external_account_id VARCHAR(255), -- Platform's native account ID

  -- OAuth Tokens (encrypted in production)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Profile Data from Buffer
  profile_ids JSONB DEFAULT '[]'::jsonb,  -- Array of connected profiles
  avatar_url VARCHAR(500),

  -- Status
  is_active BOOLEAN DEFAULT true,
  connection_status VARCHAR(50) DEFAULT 'connected'
    CHECK (connection_status IN ('connected', 'disconnected', 'expired', 'error')),
  last_error TEXT,
  last_sync_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  connected_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for social_accounts
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_social_accounts_status ON social_accounts(connection_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_buffer_profile ON social_accounts(buffer_profile_id) WHERE buffer_profile_id IS NOT NULL;

-- ============================================================================
-- 2. SCHEDULED POSTS (Social media posts queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id SERIAL PRIMARY KEY,

  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  link_url VARCHAR(2000),

  -- Platform & Account
  platform VARCHAR(50) NOT NULL
    CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'pinterest')),
  account_id INTEGER REFERENCES social_accounts(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',

  -- Status
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),

  -- Buffer Integration
  buffer_post_id VARCHAR(255),
  buffer_update_id VARCHAR(255),

  -- Publishing Results
  published_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Content Metadata
  content_type VARCHAR(50)
    CHECK (content_type IS NULL OR content_type IN ('general', 'wine_spotlight', 'event_promo', 'seasonal', 'educational', 'behind_scenes', 'customer_story', 'suggestion')),
  winery_id INTEGER,  -- Reference to winery if content is winery-specific

  -- Analytics (synced from Buffer/platforms)
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  analytics_synced_at TIMESTAMPTZ,

  -- A/B Testing (optional)
  ab_test_id INTEGER,
  variant_letter VARCHAR(1),

  -- Metadata
  source VARCHAR(50) DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_generator', 'suggestion', 'duplicate', 'import')),
  suggestion_id INTEGER,  -- If created from a suggestion

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for scheduled_posts
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform ON scheduled_posts(platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account ON scheduled_posts(account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_winery ON scheduled_posts(winery_id) WHERE winery_id IS NOT NULL;

-- Composite index for common query: find posts ready to publish
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_ready ON scheduled_posts(status, scheduled_for)
  WHERE status = 'scheduled';

-- Index for finding posts by date range (calendar view)
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date_range ON scheduled_posts(scheduled_for, status);

-- Index for Buffer sync
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_buffer ON scheduled_posts(buffer_post_id)
  WHERE buffer_post_id IS NOT NULL;

-- ============================================================================
-- 3. CONTENT SUGGESTIONS (AI-generated daily suggestions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_suggestions (
  id SERIAL PRIMARY KEY,

  -- Suggestion Date & Platform
  suggestion_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform VARCHAR(50) NOT NULL
    CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'pinterest')),

  -- Content Type
  content_type VARCHAR(50) NOT NULL
    CHECK (content_type IN ('general', 'wine_spotlight', 'event_promo', 'seasonal', 'educational', 'behind_scenes', 'customer_story')),

  -- Winery (if applicable)
  winery_id INTEGER,
  winery_name VARCHAR(255),

  -- Generated Content
  suggested_content TEXT NOT NULL,
  suggested_hashtags TEXT[] DEFAULT '{}',
  suggested_time TIMESTAMPTZ,

  -- Image Suggestions
  suggested_media_urls TEXT[] DEFAULT '{}',
  media_source VARCHAR(50) DEFAULT 'library'
    CHECK (media_source IN ('library', 'unsplash', 'none')),
  image_search_query VARCHAR(255),

  -- Reasoning & Data Sources
  reasoning TEXT NOT NULL,  -- Why this suggestion was made
  data_sources JSONB DEFAULT '[]'::jsonb,  -- Array of data source info

  -- Priority & Scoring
  priority INTEGER DEFAULT 5
    CHECK (priority >= 1 AND priority <= 10),
  relevance_score DECIMAL(3,2),

  -- Status
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'modified', 'dismissed', 'expired')),

  -- If accepted/modified
  scheduled_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by INT REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for content_suggestions
CREATE INDEX IF NOT EXISTS idx_content_suggestions_date ON content_suggestions(suggestion_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_platform ON content_suggestions(platform);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_status ON content_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_content_suggestions_pending ON content_suggestions(status, suggestion_date DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_content_suggestions_winery ON content_suggestions(winery_id)
  WHERE winery_id IS NOT NULL;

-- Composite index for daily suggestions query
CREATE INDEX IF NOT EXISTS idx_content_suggestions_daily ON content_suggestions(suggestion_date, platform, status);

-- ============================================================================
-- 4. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_social_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all tables
DROP TRIGGER IF EXISTS trg_social_accounts_updated ON social_accounts;
CREATE TRIGGER trg_social_accounts_updated
  BEFORE UPDATE ON social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

DROP TRIGGER IF EXISTS trg_scheduled_posts_updated ON scheduled_posts;
CREATE TRIGGER trg_scheduled_posts_updated
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

DROP TRIGGER IF EXISTS trg_content_suggestions_updated ON content_suggestions;
CREATE TRIGGER trg_content_suggestions_updated
  BEFORE UPDATE ON content_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_social_updated_at();

-- ============================================================================
-- 5. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for posts ready to publish (for cron job)
CREATE OR REPLACE VIEW v_posts_ready_to_publish AS
SELECT
  sp.*,
  sa.buffer_profile_id,
  sa.platform as account_platform,
  sa.account_name,
  sa.connection_status
FROM scheduled_posts sp
LEFT JOIN social_accounts sa ON sp.account_id = sa.id
WHERE sp.status = 'scheduled'
  AND sp.scheduled_for <= NOW()
  AND (sa.id IS NULL OR sa.connection_status = 'connected');

-- View for today's pending suggestions
CREATE OR REPLACE VIEW v_pending_suggestions AS
SELECT
  cs.*
FROM content_suggestions cs
WHERE cs.status = 'pending'
  AND cs.suggestion_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY cs.priority DESC, cs.suggestion_date DESC;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE social_accounts IS 'Connected social media accounts via Buffer OAuth';
COMMENT ON TABLE scheduled_posts IS 'Queue of social media posts for publishing';
COMMENT ON TABLE content_suggestions IS 'AI-generated daily content suggestions backed by real data';
COMMENT ON VIEW v_posts_ready_to_publish IS 'Posts that are ready to be sent to Buffer';
COMMENT ON VIEW v_pending_suggestions IS 'Pending content suggestions for review';

COMMENT ON COLUMN social_accounts.access_token_encrypted IS 'Encrypted OAuth access token - never store plaintext';
COMMENT ON COLUMN scheduled_posts.buffer_post_id IS 'ID returned by Buffer after successful queue';
COMMENT ON COLUMN content_suggestions.reasoning IS 'AI explanation of why this content was suggested';
COMMENT ON COLUMN content_suggestions.data_sources IS 'JSON array of data sources used: events, competitors, seasonal, etc.';

COMMIT;
