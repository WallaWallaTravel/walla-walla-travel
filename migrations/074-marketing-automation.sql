-- ============================================================================
-- Migration 065: Marketing Automation System
-- Description: Extends social media automation with performance tracking,
--              SEO intelligence, campaign orchestration, content approval
--              learning, trending topics, and blog content generation.
-- Created: 2026-02-16
-- Depends on: 060-social-media-automation.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. INTEGRATIONS (OAuth tokens for external services)
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrations (
  id SERIAL PRIMARY KEY,
  service VARCHAR(100) NOT NULL UNIQUE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_service ON integrations(service);

-- ============================================================================
-- 2. SEARCH CONSOLE DATA (Daily search performance snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_console_data (
  id SERIAL PRIMARY KEY,
  data_date DATE NOT NULL,
  page_url VARCHAR(2000) NOT NULL,
  query VARCHAR(1000),
  country VARCHAR(10) DEFAULT 'usa',
  device VARCHAR(20) DEFAULT 'all',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  position DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_console_date ON search_console_data(data_date DESC);
CREATE INDEX IF NOT EXISTS idx_search_console_page ON search_console_data(page_url);
CREATE INDEX IF NOT EXISTS idx_search_console_query ON search_console_data(query);
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_console_unique
  ON search_console_data(data_date, page_url, COALESCE(query, ''), country, device);

-- ============================================================================
-- 3. MARKETING STRATEGIES (AI-generated weekly strategies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_strategies (
  id SERIAL PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  theme VARCHAR(500),
  summary TEXT NOT NULL,
  data_inputs JSONB DEFAULT '{}'::jsonb,
  recommended_posts JSONB DEFAULT '[]'::jsonb,
  keyword_opportunities JSONB DEFAULT '[]'::jsonb,
  content_gaps JSONB DEFAULT '[]'::jsonb,
  performance_summary JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_strategies_week ON marketing_strategies(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_strategies_status ON marketing_strategies(status);

-- ============================================================================
-- 4. MARKETING CAMPAIGNS (Multi-channel campaign orchestration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  channels TEXT[] DEFAULT '{}',
  target_audience VARCHAR(255),
  budget DECIMAL(10,2),
  goals JSONB DEFAULT '{}'::jsonb,
  performance JSONB DEFAULT '{}'::jsonb,
  auto_generated BOOLEAN DEFAULT false,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON marketing_campaigns(start_date, end_date);

-- ============================================================================
-- 5. CAMPAIGN ITEMS (Individual pieces within a campaign)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaign_items (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL
    CHECK (channel IN ('instagram', 'facebook', 'linkedin', 'email', 'blog', 'page_update')),
  item_type VARCHAR(50) NOT NULL
    CHECK (item_type IN ('social_post', 'email_blast', 'blog_post', 'page_update')),
  content TEXT NOT NULL,
  subject_line VARCHAR(500),
  media_urls TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'sent', 'failed', 'cancelled')),
  scheduled_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  performance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_items_campaign ON campaign_items(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_items_status ON campaign_items(status);
CREATE INDEX IF NOT EXISTS idx_campaign_items_channel ON campaign_items(channel);

-- ============================================================================
-- 6. CONTENT REFRESH SUGGESTIONS (Stale content detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_refresh_suggestions (
  id SERIAL PRIMARY KEY,
  page_path VARCHAR(2000) NOT NULL,
  page_title VARCHAR(500),
  reason VARCHAR(100) NOT NULL
    CHECK (reason IN ('stale_date', 'declining_traffic', 'outdated_info', 'seasonal_update', 'keyword_opportunity')),
  current_content TEXT,
  suggested_update TEXT,
  urgency VARCHAR(20) DEFAULT 'medium'
    CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  last_modified DATE,
  days_since_update INTEGER,
  impressions_trend VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'applied', 'dismissed')),
  applied_at TIMESTAMPTZ,
  applied_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_refresh_status ON content_refresh_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_content_refresh_urgency ON content_refresh_suggestions(urgency);
CREATE INDEX IF NOT EXISTS idx_content_refresh_page ON content_refresh_suggestions(page_path);

-- ============================================================================
-- 7. TRENDING TOPICS (AI-detected market trends)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trending_topics (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(500) NOT NULL,
  category VARCHAR(100)
    CHECK (category IN ('wine', 'travel', 'local_news', 'events', 'seasonal', 'industry', 'food', 'lifestyle')),
  summary TEXT NOT NULL,
  relevance_score INTEGER DEFAULT 5
    CHECK (relevance_score >= 1 AND relevance_score <= 10),
  suggested_content TEXT,
  suggested_angle TEXT,
  source_urls TEXT[] DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'new'
    CHECK (status IN ('new', 'actioned', 'dismissed', 'expired')),
  actioned_post_id INTEGER REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_topics_status ON trending_topics(status);
CREATE INDEX IF NOT EXISTS idx_trending_topics_category ON trending_topics(category);
CREATE INDEX IF NOT EXISTS idx_trending_topics_detected ON trending_topics(detected_at DESC);

-- ============================================================================
-- 8. BLOG DRAFTS (Long-form SEO content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS blog_drafts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500),
  meta_description VARCHAR(320),
  target_keywords TEXT[] DEFAULT '{}',
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  estimated_read_time INTEGER DEFAULT 0,
  json_ld JSONB,
  featured_image_url VARCHAR(2000),
  featured_image_alt VARCHAR(500),
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  published_url VARCHAR(2000),
  published_at TIMESTAMPTZ,
  seo_score INTEGER,
  readability_score INTEGER,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_drafts_status ON blog_drafts(status);
CREATE INDEX IF NOT EXISTS idx_blog_drafts_slug ON blog_drafts(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_drafts_category ON blog_drafts(category);

-- ============================================================================
-- 9. CONTENT APPROVALS (Learning system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_approvals (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(50) NOT NULL
    CHECK (content_type IN ('social_post', 'email', 'blog', 'page_update', 'campaign')),
  content_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL
    CHECK (action IN ('approved', 'edited', 'rejected')),
  original_content TEXT NOT NULL,
  final_content TEXT,
  edit_diff TEXT,
  platform VARCHAR(50),
  content_category VARCHAR(50),
  tone VARCHAR(50),
  approval_time_seconds INTEGER,
  notes TEXT,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_approvals_type ON content_approvals(content_type);
CREATE INDEX IF NOT EXISTS idx_content_approvals_action ON content_approvals(action);
CREATE INDEX IF NOT EXISTS idx_content_approvals_date ON content_approvals(created_at DESC);

-- ============================================================================
-- 10. AI LEARNING PREFERENCES (Patterns learned from approvals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_learning_preferences (
  id SERIAL PRIMARY KEY,
  preference_type VARCHAR(100) NOT NULL
    CHECK (preference_type IN ('tone', 'length', 'emoji_usage', 'hashtag_style', 'cta_style', 'topic_preference', 'rejection_pattern', 'edit_pattern')),
  platform VARCHAR(50),
  pattern TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.50
    CHECK (confidence_score >= 0 AND confidence_score <= 1),
  learned_from_count INTEGER DEFAULT 1,
  example_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_preferences_type ON ai_learning_preferences(preference_type);
CREATE INDEX IF NOT EXISTS idx_ai_preferences_platform ON ai_learning_preferences(platform);
CREATE INDEX IF NOT EXISTS idx_ai_preferences_active ON ai_learning_preferences(is_active) WHERE is_active = true;

-- ============================================================================
-- 11. WEEKLY REPORT LOGS (Track sent reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_report_logs (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(50) NOT NULL
    CHECK (report_type IN ('weekly_summary', 'monthly_summary', 'strategy', 'performance_alert')),
  report_date DATE NOT NULL,
  report_content TEXT NOT NULL,
  metrics JSONB DEFAULT '{}'::jsonb,
  sent_to TEXT[] DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_logs_type ON marketing_report_logs(report_type);
CREATE INDEX IF NOT EXISTS idx_report_logs_date ON marketing_report_logs(report_date DESC);

-- ============================================================================
-- 12. TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_marketing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'integrations',
    'marketing_strategies',
    'marketing_campaigns',
    'campaign_items',
    'content_refresh_suggestions',
    'trending_topics',
    'blog_drafts',
    'ai_learning_preferences'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated ON %I;
      CREATE TRIGGER trg_%I_updated
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION update_marketing_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ============================================================================
-- 13. COMMENTS
-- ============================================================================

COMMENT ON TABLE integrations IS 'OAuth tokens and config for external services (Google Search Console, etc.)';
COMMENT ON TABLE search_console_data IS 'Daily search performance snapshots from Google Search Console';
COMMENT ON TABLE marketing_strategies IS 'AI-generated weekly marketing strategy documents';
COMMENT ON TABLE marketing_campaigns IS 'Multi-channel marketing campaigns coordinating social, email, and content';
COMMENT ON TABLE campaign_items IS 'Individual content pieces within a marketing campaign';
COMMENT ON TABLE content_refresh_suggestions IS 'AI-detected stale content needing updates';
COMMENT ON TABLE trending_topics IS 'AI-detected trending topics relevant to wine tourism';
COMMENT ON TABLE blog_drafts IS 'Long-form SEO content drafts for blog/guide pages';
COMMENT ON TABLE content_approvals IS 'Tracks admin approval/editing/rejection of AI-generated content';
COMMENT ON TABLE ai_learning_preferences IS 'Patterns learned from content approval history';
COMMENT ON TABLE marketing_report_logs IS 'Log of sent marketing reports and summaries';

COMMIT;
