-- Migration 002: Add Defect Tracking to Inspections and Vehicles
-- Purpose: Enable defect reporting and vehicle out-of-service workflow
-- Date: 2025-10-16

-- ==========================================
-- PART 1: Add defect tracking to inspections
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
-- PART 2: Add defect tracking to vehicles
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
  inspections_columns_exist BOOLEAN;
  vehicles_columns_exist BOOLEAN;
BEGIN
  -- Check inspections columns
  SELECT
    COUNT(*) = 3
  INTO inspections_columns_exist
  FROM information_schema.columns
  WHERE table_name = 'inspections'
    AND column_name IN ('defects_found', 'defect_severity', 'defect_description');

  -- Check vehicles columns
  SELECT
    COUNT(*) = 3
  INTO vehicles_columns_exist
  FROM information_schema.columns
  WHERE table_name = 'vehicles'
    AND column_name IN ('defect_notes', 'defect_reported_at', 'defect_reported_by');

  IF inspections_columns_exist AND vehicles_columns_exist THEN
    RAISE NOTICE '✅ Migration 002 successful!';
    RAISE NOTICE '   - Added defect tracking to inspections table';
    RAISE NOTICE '   - Added defect tracking to vehicles table';
    RAISE NOTICE '   - Created indexes and constraints';
  ELSE
    RAISE EXCEPTION '❌ Migration 002 failed! Missing columns';
  END IF;
END $$;
