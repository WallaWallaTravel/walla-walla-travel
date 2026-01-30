-- ============================================================================
-- Migration 054: CRM Module
-- Description: Comprehensive CRM system with contacts, deals, pipeline,
--              activities, and tasks for unified customer management
-- Created: 2026-01-27
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. CLEANUP PARTIAL RUNS (drop if exists to handle partial migrations)
-- ============================================================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS crm_contact_summary CASCADE;
DROP VIEW IF EXISTS crm_pipeline_summary CASCADE;

-- Drop tables in reverse dependency order (CASCADE handles triggers automatically)
DROP TABLE IF EXISTS crm_tasks CASCADE;
DROP TABLE IF EXISTS crm_activities CASCADE;
DROP TABLE IF EXISTS crm_deals CASCADE;
DROP TABLE IF EXISTS crm_contacts CASCADE;
DROP TABLE IF EXISTS crm_deal_types CASCADE;
DROP TABLE IF EXISTS crm_pipeline_stages CASCADE;
DROP TABLE IF EXISTS crm_pipeline_templates CASCADE;
DROP TABLE IF EXISTS corporate_requests CASCADE;

-- ============================================================================
-- 1. PIPELINE TEMPLATES (for multi-brand support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_pipeline_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  brand VARCHAR(50), -- NULL = all brands, 'nw_touring' or 'walla_walla_travel'
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pipeline templates (only if they don't exist)
INSERT INTO crm_pipeline_templates (name, description, brand, is_default)
SELECT * FROM (VALUES
  ('Retail Tour', 'Simple 4-stage flow for quick bookings', 'nw_touring', true),
  ('Proposal Flow', 'Full sales cycle with proposals', 'walla_walla_travel', true),
  ('Event Flow', 'Extended flow for weddings and large events', NULL::VARCHAR, false)
) AS v(name, description, brand, is_default)
WHERE NOT EXISTS (SELECT 1 FROM crm_pipeline_templates WHERE name = v.name);

-- ============================================================================
-- 2. PIPELINE STAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id SERIAL PRIMARY KEY,
  template_id INT REFERENCES crm_pipeline_templates(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL,
  probability INT DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  is_won BOOLEAN DEFAULT false,
  is_lost BOOLEAN DEFAULT false,
  color VARCHAR(20) DEFAULT 'slate',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, name)
);

-- Retail Tour stages (NW Touring - simple flow)
INSERT INTO crm_pipeline_stages (template_id, name, sort_order, probability, is_won, is_lost, color)
SELECT t.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost, s.color
FROM crm_pipeline_templates t
CROSS JOIN (VALUES
  ('New Inquiry', 1, 10, false, false, 'slate'),
  ('Quoted', 2, 50, false, false, 'blue'),
  ('Won', 3, 100, true, false, 'green'),
  ('Lost', 4, 0, false, true, 'red')
) AS s(name, sort_order, probability, is_won, is_lost, color)
WHERE t.name = 'Retail Tour'
  AND NOT EXISTS (
    SELECT 1 FROM crm_pipeline_stages ps
    WHERE ps.template_id = t.id AND ps.name = s.name
  );

-- Proposal Flow stages (Walla Walla Travel - full flow)
INSERT INTO crm_pipeline_stages (template_id, name, sort_order, probability, is_won, is_lost, color)
SELECT t.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost, s.color
FROM crm_pipeline_templates t
CROSS JOIN (VALUES
  ('New Lead', 1, 10, false, false, 'slate'),
  ('Contacted', 2, 20, false, false, 'blue'),
  ('Qualified', 3, 40, false, false, 'indigo'),
  ('Proposal Sent', 4, 60, false, false, 'purple'),
  ('Negotiating', 5, 80, false, false, 'amber'),
  ('Won', 6, 100, true, false, 'green'),
  ('Lost', 7, 0, false, true, 'red')
) AS s(name, sort_order, probability, is_won, is_lost, color)
WHERE t.name = 'Proposal Flow'
  AND NOT EXISTS (
    SELECT 1 FROM crm_pipeline_stages ps
    WHERE ps.template_id = t.id AND ps.name = s.name
  );

-- Event Flow stages (both brands - extended)
INSERT INTO crm_pipeline_stages (template_id, name, sort_order, probability, is_won, is_lost, color)
SELECT t.id, s.name, s.sort_order, s.probability, s.is_won, s.is_lost, s.color
FROM crm_pipeline_templates t
CROSS JOIN (VALUES
  ('New Lead', 1, 10, false, false, 'slate'),
  ('Discovery Call', 2, 20, false, false, 'blue'),
  ('Qualified', 3, 35, false, false, 'indigo'),
  ('Proposal Sent', 4, 50, false, false, 'purple'),
  ('Presented', 5, 65, false, false, 'violet'),
  ('Contract Sent', 6, 80, false, false, 'amber'),
  ('Won', 7, 100, true, false, 'green'),
  ('Lost', 8, 0, false, true, 'red')
) AS s(name, sort_order, probability, is_won, is_lost, color)
WHERE t.name = 'Event Flow'
  AND NOT EXISTS (
    SELECT 1 FROM crm_pipeline_stages ps
    WHERE ps.template_id = t.id AND ps.name = s.name
  );

-- ============================================================================
-- 3. DEAL TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_deal_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(50), -- 'nw_touring', 'walla_walla_travel', or NULL for both
  pipeline_template_id INT REFERENCES crm_pipeline_templates(id),
  default_value DECIMAL(10,2),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, brand)
);

-- Insert deal types (only if they don't exist)
INSERT INTO crm_deal_types (name, brand, pipeline_template_id, default_value, sort_order)
SELECT dt.name, dt.brand, t.id, dt.default_value, dt.sort_order
FROM (VALUES
  -- NW Touring deal types
  ('Private Wine Tour', 'nw_touring', 'Retail Tour', 800.00, 1),
  ('Airport Transfer', 'nw_touring', 'Retail Tour', 150.00, 2),
  ('Day Trip', 'nw_touring', 'Retail Tour', 600.00, 3),
  -- Walla Walla Travel deal types
  ('Corporate Event', 'walla_walla_travel', 'Proposal Flow', 5000.00, 10),
  ('Bachelorette Party', 'walla_walla_travel', 'Proposal Flow', 3500.00, 11),
  ('Wedding Weekend', NULL, 'Event Flow', 8000.00, 20),
  ('Multi-Day Itinerary', 'walla_walla_travel', 'Proposal Flow', 4000.00, 12),
  ('Group Tour', 'walla_walla_travel', 'Proposal Flow', 2500.00, 13)
) AS dt(name, brand, template_name, default_value, sort_order)
JOIN crm_pipeline_templates t ON t.name = dt.template_name
WHERE NOT EXISTS (
  SELECT 1 FROM crm_deal_types d
  WHERE d.name = dt.name AND (d.brand = dt.brand OR (d.brand IS NULL AND dt.brand IS NULL))
);

-- ============================================================================
-- 4. CRM CONTACTS (Unified Contact Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_contacts (
  id SERIAL PRIMARY KEY,

  -- Core Identity
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),

  -- Contact Type
  contact_type VARCHAR(50) DEFAULT 'individual'
    CHECK (contact_type IN ('individual', 'corporate', 'referral_partner')),

  -- Lifecycle Stage
  lifecycle_stage VARCHAR(50) DEFAULT 'lead'
    CHECK (lifecycle_stage IN ('lead', 'qualified', 'opportunity', 'customer', 'repeat_customer', 'lost')),

  -- Lead Scoring
  lead_score INT DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_temperature VARCHAR(20) DEFAULT 'cold'
    CHECK (lead_temperature IN ('cold', 'warm', 'hot')),

  -- Source Tracking
  source VARCHAR(100),
  source_detail VARCHAR(255),

  -- Preferences
  preferred_wineries TEXT[],
  dietary_restrictions VARCHAR(255),
  accessibility_needs VARCHAR(255),
  notes TEXT,

  -- Marketing Consent
  email_marketing_consent BOOLEAN DEFAULT false,
  sms_marketing_consent BOOLEAN DEFAULT false,

  -- Financial Summary (denormalized for quick access)
  total_bookings INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  last_booking_date DATE,

  -- Assignment
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,

  -- Integration Links
  stripe_customer_id VARCHAR(100),
  customer_id INT REFERENCES customers(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,

  UNIQUE(email)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_crm_contacts_lifecycle ON crm_contacts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned ON crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_follow_up ON crm_contacts(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_temperature ON crm_contacts(lead_temperature);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_customer_id ON crm_contacts(customer_id) WHERE customer_id IS NOT NULL;

-- ============================================================================
-- 5. CRM DEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_deals (
  id SERIAL PRIMARY KEY,

  -- Contact & Stage
  contact_id INT NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  stage_id INT NOT NULL REFERENCES crm_pipeline_stages(id),
  deal_type_id INT REFERENCES crm_deal_types(id),

  -- Brand tracking
  brand VARCHAR(50) CHECK (brand IN ('nw_touring', 'walla_walla_travel')),

  -- Deal Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  party_size INT CHECK (party_size > 0),

  -- Dates
  expected_tour_date DATE,
  expected_close_date DATE,

  -- Value
  estimated_value DECIMAL(10,2) CHECK (estimated_value >= 0),
  actual_value DECIMAL(10,2) CHECK (actual_value >= 0),

  -- Win/Loss
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason VARCHAR(255),

  -- Links to existing entities
  consultation_id INT, -- Link to trips table (consultations)
  corporate_request_id INT,
  proposal_id INT REFERENCES proposals(id) ON DELETE SET NULL,
  trip_proposal_id INT, -- FK to trip_proposals added when that table exists
  booking_id INT REFERENCES bookings(id) ON DELETE SET NULL,

  -- Assignment
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stage_changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for deals
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact ON crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_close_date ON crm_deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_brand ON crm_deals(brand);
CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned ON crm_deals(assigned_to);

-- ============================================================================
-- 6. CRM ACTIVITIES (Communication & Activity Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_activities (
  id SERIAL PRIMARY KEY,

  -- Polymorphic Link (can be for contact OR deal)
  contact_id INT REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id INT REFERENCES crm_deals(id) ON DELETE CASCADE,

  -- Activity Type
  activity_type VARCHAR(50) NOT NULL
    CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'proposal_sent', 'proposal_viewed', 'payment_received', 'system', 'status_change')),

  -- Content
  subject VARCHAR(255),
  body TEXT,

  -- Call-specific
  call_duration_minutes INT CHECK (call_duration_minutes >= 0),
  call_outcome VARCHAR(50)
    CHECK (call_outcome IS NULL OR call_outcome IN ('connected', 'voicemail', 'no_answer', 'busy', 'wrong_number')),

  -- Email-specific
  email_direction VARCHAR(20)
    CHECK (email_direction IS NULL OR email_direction IN ('inbound', 'outbound')),
  email_status VARCHAR(20)
    CHECK (email_status IS NULL OR email_status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced')),

  -- Metadata
  performed_by INT REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),

  -- For automated activities
  source_type VARCHAR(50)
    CHECK (source_type IS NULL OR source_type IN ('manual', 'system', 'email_sync', 'proposal_webhook')),
  source_id VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of contact_id or deal_id must be set
  CONSTRAINT activity_has_parent CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL)
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON crm_activities(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal ON crm_activities(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_date ON crm_activities(performed_at DESC);

-- ============================================================================
-- 7. CRM TASKS (Follow-up Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_tasks (
  id SERIAL PRIMARY KEY,

  -- Link to contact and/or deal
  contact_id INT REFERENCES crm_contacts(id) ON DELETE CASCADE,
  deal_id INT REFERENCES crm_deals(id) ON DELETE CASCADE,

  -- Task Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'follow_up'
    CHECK (task_type IN ('follow_up', 'call', 'email', 'meeting', 'proposal', 'other')),

  -- Priority & Status
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Scheduling
  due_date DATE NOT NULL,
  due_time TIME,
  reminder_at TIMESTAMPTZ,

  -- Assignment
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by INT REFERENCES users(id) ON DELETE SET NULL,
  completion_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of contact_id or deal_id should be set for context
  CONSTRAINT task_has_context CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL)
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON crm_tasks(due_date, status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON crm_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_contact ON crm_tasks(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_deal ON crm_tasks(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_tasks_overdue ON crm_tasks(due_date)
  WHERE status IN ('pending', 'in_progress');

-- ============================================================================
-- 8. CORPORATE REQUESTS (If not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_requests (
  id SERIAL PRIMARY KEY,

  -- Contact Info
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),

  -- Request Details
  event_type VARCHAR(100),
  expected_attendees INT,
  preferred_date DATE,
  alternate_dates TEXT,
  budget_range VARCHAR(100),

  -- Requirements
  requirements TEXT,
  special_requests TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),

  -- Assignment
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,

  -- CRM Link
  crm_contact_id INT REFERENCES crm_contacts(id) ON DELETE SET NULL,
  crm_deal_id INT REFERENCES crm_deals(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corporate_requests_status ON corporate_requests(status);
CREATE INDEX IF NOT EXISTS idx_corporate_requests_email ON corporate_requests(contact_email);

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to update contact's last_contacted_at when activity is logged
CREATE OR REPLACE FUNCTION update_contact_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE crm_contacts
    SET last_contacted_at = NEW.performed_at,
        updated_at = NOW()
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for activity logging
DROP TRIGGER IF EXISTS trg_update_contact_last_contacted ON crm_activities;
CREATE TRIGGER trg_update_contact_last_contacted
  AFTER INSERT ON crm_activities
  FOR EACH ROW
  WHEN (NEW.activity_type IN ('call', 'email', 'meeting'))
  EXECUTE FUNCTION update_contact_last_contacted();

-- Function to update deal's stage_changed_at when stage changes
CREATE OR REPLACE FUNCTION update_deal_stage_changed()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_changed_at = NOW();
    NEW.updated_at = NOW();

    -- Log the stage change as an activity
    INSERT INTO crm_activities (
      deal_id, contact_id, activity_type, subject, source_type, performed_at
    ) VALUES (
      NEW.id,
      NEW.contact_id,
      'status_change',
      'Deal stage changed',
      'system',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deal stage changes
DROP TRIGGER IF EXISTS trg_update_deal_stage_changed ON crm_deals;
CREATE TRIGGER trg_update_deal_stage_changed
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_stage_changed();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at on all CRM tables
DROP TRIGGER IF EXISTS trg_crm_contacts_updated ON crm_contacts;
CREATE TRIGGER trg_crm_contacts_updated
  BEFORE UPDATE ON crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

DROP TRIGGER IF EXISTS trg_crm_deals_updated ON crm_deals;
CREATE TRIGGER trg_crm_deals_updated
  BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

DROP TRIGGER IF EXISTS trg_crm_tasks_updated ON crm_tasks;
CREATE TRIGGER trg_crm_tasks_updated
  BEFORE UPDATE ON crm_tasks
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- ============================================================================
-- 10. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Pipeline summary view
CREATE OR REPLACE VIEW crm_pipeline_summary AS
SELECT
  pt.id as template_id,
  pt.name as template_name,
  pt.brand,
  ps.id as stage_id,
  ps.name as stage_name,
  ps.sort_order,
  ps.probability,
  ps.is_won,
  ps.is_lost,
  ps.color,
  COUNT(d.id) as deal_count,
  COALESCE(SUM(d.estimated_value), 0) as total_value,
  COALESCE(SUM(d.estimated_value * ps.probability / 100), 0) as weighted_value
FROM crm_pipeline_templates pt
JOIN crm_pipeline_stages ps ON ps.template_id = pt.id
LEFT JOIN crm_deals d ON d.stage_id = ps.id
  AND d.won_at IS NULL
  AND d.lost_at IS NULL
GROUP BY pt.id, pt.name, pt.brand, ps.id, ps.name, ps.sort_order, ps.probability, ps.is_won, ps.is_lost, ps.color
ORDER BY pt.id, ps.sort_order;

-- Contact summary view with deal info
CREATE OR REPLACE VIEW crm_contact_summary AS
SELECT
  c.*,
  COUNT(DISTINCT d.id) as active_deals,
  COALESCE(SUM(CASE WHEN d.won_at IS NULL AND d.lost_at IS NULL THEN d.estimated_value END), 0) as pipeline_value,
  COUNT(DISTINCT CASE WHEN d.won_at IS NOT NULL THEN d.id END) as won_deals,
  COALESCE(SUM(CASE WHEN d.won_at IS NOT NULL THEN d.actual_value END), 0) as won_value,
  (SELECT COUNT(*) FROM crm_tasks t WHERE t.contact_id = c.id AND t.status = 'pending') as pending_tasks,
  (SELECT MAX(performed_at) FROM crm_activities a WHERE a.contact_id = c.id) as last_activity_at
FROM crm_contacts c
LEFT JOIN crm_deals d ON d.contact_id = c.id
GROUP BY c.id;

COMMIT;
