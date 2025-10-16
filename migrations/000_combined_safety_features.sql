-- Combined Safety Features Migration
-- Combines Migration 001 (time_card_id) and Migration 002 (defect tracking)
-- Purpose: Enable per-shift inspections + defect reporting + out-of-service workflow
-- Date: 2025-10-16

-- ==========================================
-- PART 1: Add time_card_id to inspections (Migration 001)
-- ==========================================

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

-- ==========================================
-- PART 2: Add defect tracking to inspections (Migration 002)
-- ==========================================

-- Add defect columns to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS defects_found BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS defect_severity VARCHAR(20),
ADD COLUMN IF NOT EXISTS defect_description TEXT;

-- Add index for defect queries
CREATE INDEX IF NOT EXISTS idx_inspections_defects
ON inspections(vehicle_id, defects_found, created_at DESC)
WHERE defects_found = true;

-- Add constraint for defect_severity values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_defect_severity_check'
  ) THEN
    ALTER TABLE inspections
    ADD CONSTRAINT inspections_defect_severity_check
    CHECK (defect_severity IS NULL OR defect_severity IN ('none', 'minor', 'critical'));
  END IF;
END $$;

-- ==========================================
-- PART 3: Add defect tracking to vehicles
-- ==========================================

-- Add defect tracking columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS defect_notes TEXT,
ADD COLUMN IF NOT EXISTS defect_reported_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS defect_reported_by INTEGER REFERENCES users(id);

-- Add index for out-of-service vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_status
ON vehicles(status, is_active)
WHERE is_active = true;

-- Update status constraint to include 'out_of_service'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_status_check'
  ) THEN
    ALTER TABLE vehicles DROP CONSTRAINT vehicles_status_check;
  END IF;

  -- Add new constraint with out_of_service option
  ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_status_check
  CHECK (status IN ('available', 'assigned', 'in_use', 'out_of_service', 'maintenance'));
END $$;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
DECLARE
  time_card_id_exists BOOLEAN;
  defect_columns_inspections BOOLEAN;
  defect_columns_vehicles BOOLEAN;
BEGIN
  -- Check time_card_id
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inspections'
      AND column_name = 'time_card_id'
  ) INTO time_card_id_exists;

  -- Check defect columns in inspections
  SELECT
    COUNT(*) = 3
  INTO defect_columns_inspections
  FROM information_schema.columns
  WHERE table_name = 'inspections'
    AND column_name IN ('defects_found', 'defect_severity', 'defect_description');

  -- Check defect columns in vehicles
  SELECT
    COUNT(*) = 3
  INTO defect_columns_vehicles
  FROM information_schema.columns
  WHERE table_name = 'vehicles'
    AND column_name IN ('defect_notes', 'defect_reported_at', 'defect_reported_by');

  IF time_card_id_exists AND defect_columns_inspections AND defect_columns_vehicles THEN
    RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║ ✅ SAFETY FEATURES MIGRATION SUCCESSFUL!              ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Per-shift inspection tracking (time_card_id)';
    RAISE NOTICE '✓ Defect reporting in inspections';
    RAISE NOTICE '✓ Out-of-service vehicle workflow';
    RAISE NOTICE '✓ All indexes and constraints created';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to deploy safety features to production!';
  ELSE
    RAISE EXCEPTION '❌ Migration failed! Missing columns:
      time_card_id: %
      defect_columns_inspections: %
      defect_columns_vehicles: %',
      time_card_id_exists,
      defect_columns_inspections,
      defect_columns_vehicles;
  END IF;
END $$;
