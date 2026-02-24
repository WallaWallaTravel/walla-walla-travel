-- Migration 091: Admin internal reminders
-- Tracks admin-facing reminders for deferred deposits, milestones, and manual tasks
-- These are NOT sent to guests — they appear in the admin dashboard only

CREATE TABLE IF NOT EXISTS admin_reminders (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  trigger_type VARCHAR(30) NOT NULL DEFAULT 'time_based'
    CHECK (trigger_type IN ('time_based', 'milestone', 'manual')),
  days_before_trip INTEGER,
  trigger_milestone VARCHAR(30),
  reminder_date DATE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'triggered', 'dismissed', 'snoozed')),
  snoozed_until DATE,
  triggered_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_reminders_pending
  ON admin_reminders(status, reminder_date)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_admin_reminders_proposal
  ON admin_reminders(trip_proposal_id);
