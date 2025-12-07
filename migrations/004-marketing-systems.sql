-- Migration 004: Marketing Systems
-- Created: November 2025
-- Purpose: A/B Testing, Lead Generation, Social Media Scheduling

-- ============================================================================
-- SECTION 1: A/B TESTING SYSTEM
-- ============================================================================

-- A/B Tests Table
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hypothesis TEXT,
  
  -- Test Configuration
  test_type VARCHAR(50) NOT NULL CHECK (
    test_type IN ('content', 'timing', 'audience', 'format', 'pricing', 'cta')
  ),
  variable_tested VARCHAR(100),
  platform VARCHAR(50) CHECK (
    platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'email', 'website', 'all')
  ),
  
  -- Status & Timing
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'running', 'paused', 'completed', 'cancelled')
  ),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  sample_size_target INTEGER,
  
  -- Results
  winner VARCHAR(10) CHECK (winner IN ('a', 'b', 'inconclusive')),
  confidence_level DECIMAL(5,2),
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_platform ON ab_tests(platform);

-- Test Variants Table
CREATE TABLE IF NOT EXISTS test_variants (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_letter VARCHAR(1) NOT NULL CHECK (variant_letter IN ('a', 'b')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Content
  caption TEXT,
  image_url VARCHAR(500),
  video_url VARCHAR(500),
  hashtags TEXT[],
  cta TEXT,
  
  -- Timing
  post_time TIME,
  post_days TEXT[],
  
  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(test_id, variant_letter)
);

CREATE INDEX idx_test_variants_test ON test_variants(test_id);

-- Test Insights (AI-generated)
CREATE TABLE IF NOT EXISTS test_insights (
  id SERIAL PRIMARY KEY,
  test_id INTEGER NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) CHECK (
    insight_type IN ('pattern', 'recommendation', 'warning', 'opportunity')
  ),
  confidence DECIMAL(5,2),
  title VARCHAR(255),
  description TEXT,
  action_items TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Learning Library
CREATE TABLE IF NOT EXISTS test_learnings (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  finding TEXT NOT NULL,
  impact_percentage DECIMAL(5,2),
  confidence DECIMAL(5,2),
  test_ids INTEGER[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_test_learnings_category ON test_learnings(category);

-- ============================================================================
-- SECTION 2: LEAD GENERATION SYSTEM
-- ============================================================================

-- Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  
  -- Contact Info
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  job_title VARCHAR(255),
  
  -- Lead Source
  source VARCHAR(100) CHECK (
    source IN ('website', 'referral', 'social_media', 'email_campaign', 
               'paid_ads', 'event', 'cold_outreach', 'partner', 'other')
  ),
  source_detail VARCHAR(255),
  campaign_id INTEGER,
  
  -- Qualification
  status VARCHAR(50) DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'qualified', 'proposal_sent', 
               'negotiating', 'won', 'lost', 'nurturing')
  ),
  score INTEGER DEFAULT 0,
  temperature VARCHAR(20) CHECK (
    temperature IN ('hot', 'warm', 'cold')
  ),
  
  -- Interests
  interested_services TEXT[],
  party_size_estimate INTEGER,
  estimated_date DATE,
  budget_range VARCHAR(50),
  
  -- AI Analysis
  ai_qualification JSONB DEFAULT '{}',
  ai_score INTEGER,
  
  -- Assignment
  assigned_to INTEGER REFERENCES users(id),
  
  -- Timeline
  first_contact_at TIMESTAMP,
  last_contact_at TIMESTAMP,
  next_followup_at TIMESTAMP,
  converted_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_next_followup ON leads(next_followup_at) WHERE status NOT IN ('won', 'lost');

-- Lead Activities
CREATE TABLE IF NOT EXISTS lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  
  activity_type VARCHAR(50) NOT NULL CHECK (
    activity_type IN ('email_sent', 'email_opened', 'email_clicked', 
                      'call_made', 'call_received', 'meeting', 
                      'note_added', 'status_changed', 'proposal_sent',
                      'website_visit', 'form_submitted')
  ),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  performed_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);

-- Outreach Campaigns
CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  campaign_type VARCHAR(50) CHECK (
    campaign_type IN ('email_sequence', 'cold_outreach', 'nurture', 
                      're_engagement', 'event_followup')
  ),
  
  -- Targeting
  target_audience TEXT,
  target_criteria JSONB DEFAULT '{}',
  
  -- Content
  email_templates JSONB DEFAULT '[]',
  
  -- Schedule
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'active', 'paused', 'completed')
  ),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
  -- Performance
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_converted INTEGER DEFAULT 0,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON outreach_campaigns(status);

-- ============================================================================
-- SECTION 3: SOCIAL MEDIA SCHEDULING
-- ============================================================================

-- Social Accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL CHECK (
    platform IN ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter', 'pinterest')
  ),
  account_name VARCHAR(255) NOT NULL,
  account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_accounts_platform ON social_accounts(platform);

-- Scheduled Posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id SERIAL PRIMARY KEY,
  
  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  link_url VARCHAR(500),
  
  -- Scheduling
  platform VARCHAR(50) NOT NULL,
  account_id INTEGER REFERENCES social_accounts(id),
  scheduled_for TIMESTAMP NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (
    status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')
  ),
  published_at TIMESTAMP,
  error_message TEXT,
  
  -- A/B Testing
  ab_test_id INTEGER REFERENCES ab_tests(id),
  variant_letter VARCHAR(1),
  
  -- Performance (updated after publishing)
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_posts_scheduled ON scheduled_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_posts_platform ON scheduled_posts(platform);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);

-- Content Calendar
CREATE TABLE IF NOT EXISTS content_calendar (
  id SERIAL PRIMARY KEY,
  
  -- Content Planning
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content_type VARCHAR(50) CHECK (
    content_type IN ('post', 'story', 'reel', 'video', 'carousel', 'article', 'ad')
  ),
  
  -- Targeting
  platforms TEXT[] DEFAULT '{}',
  target_audience TEXT,
  goal VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'idea' CHECK (
    status IN ('idea', 'planned', 'in_progress', 'ready', 'scheduled', 'published')
  ),
  planned_date DATE,
  
  -- Assets
  draft_content TEXT,
  media_urls TEXT[],
  
  -- Related
  campaign_id INTEGER,
  ab_test_id INTEGER REFERENCES ab_tests(id),
  
  -- Assignment
  assigned_to INTEGER REFERENCES users(id),
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_calendar_date ON content_calendar(planned_date);
CREATE INDEX idx_content_calendar_status ON content_calendar(status);

-- ============================================================================
-- SECTION 4: EMAIL CAMPAIGNS
-- ============================================================================

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(500),
  
  status VARCHAR(50) DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')
  ),
  campaign_type VARCHAR(50) CHECK (
    campaign_type IN ('promotional', 'newsletter', 'transactional', 'drip', 'welcome')
  ),
  
  -- Content
  template_id INTEGER,
  content_html TEXT,
  content_json JSONB,
  
  -- Scheduling
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  
  -- Recipients
  recipient_list_ids INTEGER[],
  recipients_count INTEGER DEFAULT 0,
  
  -- Performance
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled ON email_campaigns(scheduled_for) WHERE status = 'scheduled';

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  category VARCHAR(50),
  content_html TEXT,
  content_json JSONB,
  thumbnail_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 5: MARKETING ANALYTICS DASHBOARD
-- ============================================================================

-- Marketing Metrics (daily snapshots)
CREATE TABLE IF NOT EXISTS marketing_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Website
  website_visits INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Conversions
  booking_inquiries INTEGER DEFAULT 0,
  bookings_made INTEGER DEFAULT 0,
  booking_value DECIMAL(10,2) DEFAULT 0,
  
  -- Social
  instagram_followers INTEGER DEFAULT 0,
  instagram_engagement DECIMAL(5,2) DEFAULT 0,
  facebook_followers INTEGER DEFAULT 0,
  facebook_engagement DECIMAL(5,2) DEFAULT 0,
  
  -- Email
  emails_sent INTEGER DEFAULT 0,
  emails_opened INTEGER DEFAULT 0,
  emails_clicked INTEGER DEFAULT 0,
  
  -- Leads
  new_leads INTEGER DEFAULT 0,
  qualified_leads INTEGER DEFAULT 0,
  converted_leads INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(metric_date)
);

CREATE INDEX idx_marketing_metrics_date ON marketing_metrics(metric_date);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Lead Pipeline View
CREATE OR REPLACE VIEW lead_pipeline AS
SELECT 
  status,
  COUNT(*) as count,
  SUM(CASE WHEN temperature = 'hot' THEN 1 ELSE 0 END) as hot_leads,
  AVG(score) as avg_score,
  COUNT(*) FILTER (WHERE next_followup_at <= NOW()) as overdue_followups
FROM leads
WHERE status NOT IN ('won', 'lost')
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'new' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'proposal_sent' THEN 4
    WHEN 'negotiating' THEN 5
    ELSE 6
  END;

-- Active Tests View
CREATE OR REPLACE VIEW active_ab_tests AS
SELECT 
  t.id,
  t.name,
  t.platform,
  t.status,
  t.start_date,
  t.end_date,
  va.impressions as variant_a_impressions,
  va.conversions as variant_a_conversions,
  vb.impressions as variant_b_impressions,
  vb.conversions as variant_b_conversions,
  t.confidence_level,
  t.winner
FROM ab_tests t
LEFT JOIN test_variants va ON t.id = va.test_id AND va.variant_letter = 'a'
LEFT JOIN test_variants vb ON t.id = vb.test_id AND vb.variant_letter = 'b'
WHERE t.status IN ('running', 'completed')
ORDER BY t.start_date DESC;

-- Upcoming Posts View
CREATE OR REPLACE VIEW upcoming_posts AS
SELECT 
  p.id,
  p.content,
  p.platform,
  p.scheduled_for,
  p.status,
  sa.account_name,
  u.name as created_by_name
FROM scheduled_posts p
LEFT JOIN social_accounts sa ON p.account_id = sa.id
LEFT JOIN users u ON p.created_by = u.id
WHERE p.scheduled_for >= NOW()
  AND p.status IN ('scheduled', 'draft')
ORDER BY p.scheduled_for;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE ab_tests IS 'A/B testing for marketing campaigns';
COMMENT ON TABLE leads IS 'Lead management for sales pipeline';
COMMENT ON TABLE scheduled_posts IS 'Social media post scheduling';
COMMENT ON TABLE content_calendar IS 'Content planning calendar';
COMMENT ON TABLE marketing_metrics IS 'Daily marketing performance metrics';

