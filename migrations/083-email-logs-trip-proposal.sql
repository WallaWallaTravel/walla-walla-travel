-- Migration 083: Create email_logs table (if missing) and add trip_proposal_id
-- The email_logs table was referenced by email services but never had a migration.

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  email_type VARCHAR(100) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trip_proposal_id column (nullable, with FK)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS trip_proposal_id INTEGER REFERENCES trip_proposals(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_booking ON email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_trip_proposal ON email_logs(trip_proposal_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
