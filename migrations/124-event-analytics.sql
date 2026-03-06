-- Migration 124: Enhanced Event Analytics
-- Creates event_analytics table for detailed tracking with source attribution.

BEGIN;

CREATE TABLE IF NOT EXISTS event_analytics (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('impression', 'click_through')),
  source VARCHAR(255),
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_analytics_event_id ON event_analytics (event_id);
CREATE INDEX idx_event_analytics_action ON event_analytics (action);
CREATE INDEX idx_event_analytics_created ON event_analytics (created_at);

ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

COMMIT;
