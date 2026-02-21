-- ============================================================================
-- Migration 084: Recurring Events Support
-- ============================================================================
-- Adds columns to support recurring event series (materialized instances).
-- Parent events serve as templates (is_recurring=true, status=draft).
-- Child events are real rows with parent_event_id pointing to the parent.
-- ============================================================================

-- Add recurring event columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id INTEGER REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_instance_override BOOLEAN DEFAULT false;

-- Index for fast child lookups
CREATE INDEX IF NOT EXISTS idx_events_parent_event_id ON events(parent_event_id);

-- Partial index for recurring parents only
CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring) WHERE is_recurring = true;
