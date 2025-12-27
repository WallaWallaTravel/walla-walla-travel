-- Migration 003: Email Logs & Automation Support
-- Created: November 2025
-- Purpose: Track all automated emails and add reminder support

-- ============================================================================
-- TABLE: email_logs
-- Track all automated emails sent
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent, failed, bounced
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_booking ON email_logs(booking_id);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- ============================================================================
-- Add reminder tracking to bookings
-- ============================================================================

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- ============================================================================
-- TABLE: scheduled_emails
-- Queue for scheduled/automated emails
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_emails_booking ON scheduled_emails(booking_id);
CREATE INDEX idx_scheduled_emails_scheduled ON scheduled_emails(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);

-- ============================================================================
-- View: upcoming_reminders
-- Helper view to find bookings needing reminders
-- ============================================================================

CREATE OR REPLACE VIEW upcoming_reminders AS
SELECT 
  b.id,
  b.booking_number,
  b.customer_name,
  b.customer_email,
  b.tour_date,
  b.start_time,
  b.reminder_sent,
  EXTRACT(DAY FROM (b.tour_date - CURRENT_DATE)) as days_until_tour
FROM bookings b
WHERE b.status IN ('confirmed', 'pending')
  AND (b.reminder_sent IS NULL OR b.reminder_sent = FALSE)
  AND b.tour_date >= CURRENT_DATE
  AND b.tour_date <= CURRENT_DATE + INTERVAL '3 days'
  AND b.customer_email IS NOT NULL
ORDER BY b.tour_date;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE email_logs IS 'Tracks all automated emails sent by the system';
COMMENT ON TABLE scheduled_emails IS 'Queue for scheduled automated emails';
COMMENT ON VIEW upcoming_reminders IS 'Bookings that need tour reminder emails';




