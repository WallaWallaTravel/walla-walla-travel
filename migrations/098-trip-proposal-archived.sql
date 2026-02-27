-- Migration 098: Add archived_at column to trip_proposals
-- Allows soft-archiving proposals without deleting them

ALTER TABLE trip_proposals ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-archived proposals
CREATE INDEX IF NOT EXISTS idx_trip_proposals_archived_at ON trip_proposals (archived_at) WHERE archived_at IS NOT NULL;
