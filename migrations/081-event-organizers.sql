-- Migration 081: Event Organizers System
-- Creates event_organizers table and event_activity_log for the organizer portal
-- Adds FK constraint from events.organizer_id to event_organizers.id

BEGIN;

-- ============================================================================
-- EVENT ORGANIZERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_organizers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  organization_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  website TEXT,
  description TEXT,
  logo_url TEXT,

  -- Account management
  status VARCHAR(20) DEFAULT 'pending',
  trust_level VARCHAR(20) DEFAULT 'standard',
  auto_approve BOOLEAN DEFAULT false,

  -- Invitation
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  setup_token VARCHAR(255),
  setup_token_expires_at TIMESTAMPTZ,
  setup_completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for valid status values
ALTER TABLE event_organizers ADD CONSTRAINT event_organizers_status_check
  CHECK (status IN ('pending', 'active', 'suspended'));

-- Add constraint for valid trust levels
ALTER TABLE event_organizers ADD CONSTRAINT event_organizers_trust_level_check
  CHECK (trust_level IN ('standard', 'trusted'));

-- ============================================================================
-- EVENT ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_activity_log (
  id SERIAL PRIMARY KEY,
  organizer_id INTEGER REFERENCES event_organizers(id),
  event_id INTEGER REFERENCES events(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADD FK FROM EVENTS TO EVENT_ORGANIZERS
-- ============================================================================

ALTER TABLE events
  ADD CONSTRAINT fk_events_organizer
  FOREIGN KEY (organizer_id) REFERENCES event_organizers(id)
  ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_event_organizers_user_id ON event_organizers(user_id);
CREATE INDEX idx_event_organizers_status ON event_organizers(status);
CREATE INDEX idx_event_organizers_setup_token ON event_organizers(setup_token) WHERE setup_token IS NOT NULL;

CREATE INDEX idx_event_activity_log_organizer ON event_activity_log(organizer_id);
CREATE INDEX idx_event_activity_log_event ON event_activity_log(event_id);
CREATE INDEX idx_event_activity_log_created ON event_activity_log(created_at);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_event_organizers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_event_organizers_updated_at
  BEFORE UPDATE ON event_organizers
  FOR EACH ROW
  EXECUTE FUNCTION update_event_organizers_updated_at();

COMMIT;
