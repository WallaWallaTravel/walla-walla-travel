-- Migration 123: Category Display Tiers
-- Adds display_tier column to event_categories for primary/secondary grouping.
-- Does NOT rename or delete any categories.

BEGIN;

ALTER TABLE event_categories
  ADD COLUMN IF NOT EXISTS display_tier VARCHAR(20) NOT NULL DEFAULT 'primary';

-- Set primary categories (shown as main filter buttons)
UPDATE event_categories SET display_tier = 'primary'
WHERE slug IN ('wine-spirits', 'live-music', 'food-dining', 'festivals', 'art-culture', 'outdoor-recreation', 'holiday-seasonal');

-- Set secondary categories (shown in "More Categories" section)
UPDATE event_categories SET display_tier = 'secondary'
WHERE slug IN ('community', 'farmers-markets', 'charity-fundraiser', 'business-networking', 'family');

COMMIT;
