-- Migration: 061-featured-photo-override.sql
-- Purpose: Add admin override column for featured winery photos
-- The featured_photo_override_id allows admins to select a photo from WWT's
-- internal media library to use as the featured image, overriding the
-- partner's designated hero photo.

-- First, ensure media_library has a primary key (required for foreign key reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'media_library' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE media_library ADD PRIMARY KEY (id);
  END IF;
END $$;

-- Add the override column
ALTER TABLE wineries
ADD COLUMN IF NOT EXISTS featured_photo_override_id INTEGER
REFERENCES media_library(id) ON DELETE SET NULL;

-- Add comment explaining the column
COMMENT ON COLUMN wineries.featured_photo_override_id IS
'Admin override: photo ID from WWT internal media library to use as featured image instead of partner hero photo';

-- Create index for the foreign key lookup
CREATE INDEX IF NOT EXISTS idx_wineries_featured_photo_override
ON wineries(featured_photo_override_id)
WHERE featured_photo_override_id IS NOT NULL;
