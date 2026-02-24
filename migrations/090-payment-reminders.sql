-- Migration 090: Payment reminder system
-- Tracks scheduled reminders for guest payments with escalating urgency levels
-- Supports auto-scheduling, manual reminders, and per-guest/proposal pausing

-- Payment reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id SERIAL PRIMARY KEY,
  trip_proposal_id INTEGER NOT NULL REFERENCES trip_proposals(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES trip_proposal_guests(id) ON DELETE CASCADE,
  reminder_type VARCHAR(30) NOT NULL DEFAULT 'auto_schedule'
    CHECK (reminder_type IN ('auto_schedule', 'manual', 'admin_internal')),
  scheduled_date DATE NOT NULL,
  days_before_deadline INTEGER,
  urgency VARCHAR(20) NOT NULL DEFAULT 'friendly'
    CHECK (urgency IN ('friendly', 'firm', 'urgent', 'final')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'skipped', 'cancelled')),
  sent_at TIMESTAMPTZ,
  skip_reason VARCHAR(255),
  paused BOOLEAN DEFAULT FALSE,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip-level reminder pause
ALTER TABLE trip_proposals
  ADD COLUMN IF NOT EXISTS reminders_paused BOOLEAN DEFAULT FALSE;

-- Indexes for efficient cron processing
CREATE INDEX IF NOT EXISTS idx_payment_reminders_pending
  ON payment_reminders(scheduled_date, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payment_reminders_proposal
  ON payment_reminders(trip_proposal_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_guest
  ON payment_reminders(guest_id);
