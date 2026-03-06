-- Migration 125: Enhanced Event Analytics
-- Adds user_agent, ip_hash, and country_code columns to event_analytics
-- for richer tracking data and source attribution reporting.

BEGIN;

ALTER TABLE event_analytics
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_event_analytics_source ON event_analytics (source);

COMMIT;
