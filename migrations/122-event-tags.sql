-- Migration 122: Event Tags System
-- Adds structured tagging with a normalized join table,
-- replacing the free-form TEXT[] tags column on events.

BEGIN;

-- Structured tag definitions
CREATE TABLE IF NOT EXISTS event_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_event_tags_slug ON event_tags (slug);

-- Join table: many-to-many between events and tags
CREATE TABLE IF NOT EXISTS event_tag_assignments (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES event_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);

CREATE INDEX idx_event_tag_assignments_tag ON event_tag_assignments (tag_id);
CREATE INDEX idx_event_tag_assignments_event ON event_tag_assignments (event_id);

-- Enable RLS (access via service_role only, matching existing pattern)
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Seed initial tags
INSERT INTO event_tags (name, slug) VALUES
  ('Family Friendly', 'family-friendly'),
  ('Free', 'free'),
  ('Outdoor', 'outdoor'),
  ('21+', '21-plus'),
  ('Food Included', 'food-included'),
  ('Live Music', 'live-music'),
  ('Recurring', 'recurring'),
  ('Visitor Favorite', 'visitor-favorite'),
  ('Downtown', 'downtown'),
  ('Winery Hosted', 'winery-hosted')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
