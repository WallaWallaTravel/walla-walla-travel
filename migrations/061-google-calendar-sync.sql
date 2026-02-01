-- Migration: 061-google-calendar-sync.sql
-- Description: Add Google Calendar event tracking for two-way sync
-- Date: 2026-02-01
-- Author: Claude

BEGIN;

-- Record this migration
INSERT INTO _migrations (migration_name, notes)
VALUES ('061-google-calendar-sync', 'Add Google Calendar event ID and sync timestamp to bookings for two-way sync')
ON CONFLICT (migration_name) DO NOTHING;

-- Add google_calendar_event_id to bookings table for tracking synced events
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);

-- Add index for efficient lookup by calendar event ID
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar_event_id
ON bookings(google_calendar_event_id)
WHERE google_calendar_event_id IS NOT NULL;

-- Add column to track when the booking was last synced to Google Calendar
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS google_calendar_synced_at TIMESTAMP;

-- Comment on columns for documentation
COMMENT ON COLUMN bookings.google_calendar_event_id IS 'Google Calendar event ID for two-way sync';
COMMENT ON COLUMN bookings.google_calendar_synced_at IS 'Timestamp of last sync to Google Calendar';

COMMIT;
