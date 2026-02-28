-- Draft Reminder System
-- Adds columns to track draft reminder state on trip proposals

ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS draft_reminders_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS draft_reminder_last_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS draft_reminder_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_trip_proposals_draft_reminders
  ON trip_proposals (status, draft_reminders_enabled, draft_reminder_last_sent_at)
  WHERE status = 'draft' AND draft_reminders_enabled = TRUE;
