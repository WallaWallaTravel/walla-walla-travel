-- ============================================================================
-- Migration 055: CRM Integration Enhancements
-- Description: Add SMS activity type and task templates for auto-task creation
-- Created: 2026-01-30
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD SMS TO ACTIVITY TYPES
-- ============================================================================

-- The crm_activities table has a CHECK constraint on activity_type.
-- We need to update it to include 'sms'.

-- First, drop the old constraint
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_activity_type_check;

-- Add the new constraint with 'sms' included
ALTER TABLE crm_activities ADD CONSTRAINT crm_activities_activity_type_check
  CHECK (activity_type IN ('call', 'email', 'sms', 'meeting', 'note', 'proposal_sent', 'proposal_viewed', 'payment_received', 'system', 'status_change', 'booking_created', 'tour_completed'));

-- ============================================================================
-- 2. CRM TASK TEMPLATES (Configurable auto-task rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm_task_templates (
  id SERIAL PRIMARY KEY,

  -- Trigger configuration
  trigger_event VARCHAR(100) NOT NULL UNIQUE,

  -- Task details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'follow_up'
    CHECK (task_type IN ('follow_up', 'call', 'email', 'meeting', 'proposal', 'other')),

  -- Priority
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Timing: positive = days AFTER trigger, negative = days BEFORE (for date-based events)
  days_from_trigger INT DEFAULT 1,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for active templates lookup
CREATE INDEX IF NOT EXISTS idx_crm_task_templates_active ON crm_task_templates(trigger_event) WHERE is_active = true;

-- Insert default task templates
INSERT INTO crm_task_templates (trigger_event, title, description, task_type, priority, days_from_trigger, is_active)
VALUES
  -- Proposal follow-up: Create task 1 day after proposal sent
  ('proposal_sent', 'Follow up on proposal', 'Check if customer has viewed the proposal and answer any questions', 'follow_up', 'high', 1, true),

  -- Tour completed: Create task 2 days after tour for check-in
  ('tour_completed', 'Post-tour check-in', 'Thank customer for their business and ask for feedback/review', 'call', 'normal', 2, true),

  -- Corporate inquiry: Same-day follow-up
  ('corporate_request', 'Follow up on corporate inquiry', 'Contact corporate lead to discuss their event requirements', 'call', 'urgent', 0, true),

  -- Booking created: Pre-tour info reminder 7 days before
  ('booking_created', 'Send pre-tour information', 'Send tour details, what to expect, and preparation tips', 'email', 'normal', -7, true),

  -- Proposal viewed but not accepted: Follow up after 3 days
  ('proposal_viewed', 'Follow up on viewed proposal', 'Customer viewed the proposal - follow up to answer questions and close the deal', 'call', 'high', 3, true),

  -- New lead from website: Quick response
  ('new_lead', 'Welcome new lead', 'Send welcome email and schedule discovery call', 'email', 'high', 0, true)
ON CONFLICT (trigger_event) DO NOTHING;

-- ============================================================================
-- 3. ADD TRIGGER FOR TASK TEMPLATE UPDATED_AT
-- ============================================================================

-- Use existing update_crm_updated_at function from 054-crm-module.sql
DROP TRIGGER IF EXISTS trg_crm_task_templates_updated ON crm_task_templates;
CREATE TRIGGER trg_crm_task_templates_updated
  BEFORE UPDATE ON crm_task_templates
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

COMMIT;
