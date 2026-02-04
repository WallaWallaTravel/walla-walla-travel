-- Migration: 065-allow-overlap-vehicle-blocks.sql
-- Description: Adds allow_overlap column to support private offset tours
-- Date: 2026-02-03
--
-- BACKGROUND:
-- Private offset tours use ONE vehicle and ONE driver for TWO groups with staggered
-- schedules throughout the day. While one group is tasting, the other is being transported.
-- This requires TWO booking blocks for the same vehicle with overlapping time ranges.
--
-- The existing exclusion constraint rejects ANY overlapping blocks for the same vehicle,
-- which prevents legitimate private offset bookings from admin.
--
-- SOLUTION:
-- Add allow_overlap boolean column that bypasses the exclusion constraint when TRUE.
-- - Normal bookings: allow_overlap = false (default) -> constraint enforced
-- - Private offset: Admin sets allow_overlap = true on BOTH blocks -> constraint bypassed
-- - Only admin can set this flag via API validation

-- ============================================================================
-- ADD allow_overlap COLUMN
-- ============================================================================

ALTER TABLE vehicle_availability_blocks
ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN vehicle_availability_blocks.allow_overlap IS
  'When TRUE, this block can overlap with other blocks on the same vehicle. Used for private offset tours where one vehicle serves two staggered groups.';

-- ============================================================================
-- RECREATE EXCLUSION CONSTRAINT
-- ============================================================================
-- The constraint now respects allow_overlap flag:
-- - Blocks with allow_overlap = TRUE are excluded from the constraint check
-- - Blocks with allow_overlap = FALSE (default) still cannot overlap
--
-- NOTE: The original constraint used NOW() for hold expiry checks, but NOW() is
-- not IMMUTABLE which PostgreSQL requires for exclusion constraint predicates.
-- Instead, expired holds are cleaned up by the application-level cleanup function
-- (cleanupExpiredHolds) which runs opportunistically. This is safer and more reliable.

ALTER TABLE vehicle_availability_blocks
DROP CONSTRAINT IF EXISTS no_overlapping_blocks;

ALTER TABLE vehicle_availability_blocks
ADD CONSTRAINT no_overlapping_blocks EXCLUDE USING gist (
    vehicle_id WITH =,
    block_date WITH =,
    tsrange(
        (block_date + start_time)::timestamp,
        (block_date + end_time)::timestamp
    ) WITH &&
) WHERE (allow_overlap = FALSE);

-- ============================================================================
-- UPDATE HELPER FUNCTIONS
-- ============================================================================
-- Note: The check_vehicle_availability() function and create_availability_hold()
-- function from migration 046 still work correctly because:
-- 1. check_vehicle_availability() checks for conflicts - blocks with allow_overlap=true
--    won't cause constraint violations, so they don't need to be considered
-- 2. create_availability_hold() creates holds that will succeed/fail based on the
--    constraint, which now respects allow_overlap

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1,
       '065-allow-overlap-vehicle-blocks',
       'Added allow_overlap column to vehicle_availability_blocks for private offset tour support'
FROM _migrations;
