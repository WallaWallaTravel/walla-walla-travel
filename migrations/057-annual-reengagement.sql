-- ============================================================================
-- Migration 057: Annual Re-engagement Automation
-- Description: Add task template and infrastructure for annual customer re-engagement
-- Created: 2026-01-30
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD TASK TEMPLATE FOR ANNUAL RE-ENGAGEMENT
-- ============================================================================

INSERT INTO crm_task_templates (trigger_event, title, description, task_type, priority, days_from_trigger, is_active)
VALUES (
  'annual_reengagement',
  'Annual check-in: {{customerName}}',
  'It''s been one year since {{customerName}}''s last tour. Reach out to see if they''d like to plan another visit to Walla Walla wine country.',
  'follow_up',
  'normal',
  0,
  true
)
ON CONFLICT (trigger_event) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  task_type = EXCLUDED.task_type,
  priority = EXCLUDED.priority,
  days_from_trigger = EXCLUDED.days_from_trigger,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================================================
-- 2. ADD COLUMN TO TRACK LAST RE-ENGAGEMENT
-- ============================================================================

-- Add column to track when we last reached out for re-engagement
ALTER TABLE crm_contacts
ADD COLUMN IF NOT EXISTS last_reengagement_at TIMESTAMPTZ;

-- Add index for finding contacts due for re-engagement
CREATE INDEX IF NOT EXISTS idx_crm_contacts_reengagement
ON crm_contacts(last_booking_date, last_reengagement_at)
WHERE lifecycle_stage IN ('customer', 'repeat_customer');

-- ============================================================================
-- 3. COMMENT
-- ============================================================================

COMMENT ON COLUMN crm_contacts.last_reengagement_at IS 'Timestamp of last annual re-engagement outreach';

COMMIT;
