-- Migration 083: Add trip_proposal_id to email_logs
-- Links email logs to trip proposals for tracking automated emails

-- Add trip_proposal_id column (nullable, with FK)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS trip_proposal_id INTEGER REFERENCES trip_proposals(id) ON DELETE SET NULL;

-- Index for looking up emails by trip proposal
CREATE INDEX IF NOT EXISTS idx_email_logs_trip_proposal ON email_logs(trip_proposal_id);
