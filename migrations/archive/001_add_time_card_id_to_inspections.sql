-- Migration: Add time_card_id to inspections table
-- Purpose: Enable per-shift inspection tracking (critical safety fix)
-- Date: 2025-10-16
--
-- This allows multiple drivers to use the same vehicle in one day,
-- each requiring their own pre-trip and post-trip inspections.

-- Add time_card_id column (nullable for existing records)
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS time_card_id INTEGER REFERENCES time_cards(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_inspections_time_card_id
ON inspections(time_card_id);

-- Add composite index for common query pattern (time_card_id + type)
CREATE INDEX IF NOT EXISTS idx_inspections_time_card_type
ON inspections(time_card_id, type)
WHERE time_card_id IS NOT NULL;

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inspections'
      AND column_name = 'time_card_id'
  ) THEN
    RAISE NOTICE '✅ Migration successful! time_card_id column added to inspections table';
  ELSE
    RAISE EXCEPTION '❌ Migration failed! time_card_id column not found';
  END IF;
END $$;
