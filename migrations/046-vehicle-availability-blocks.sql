-- Migration: 046-vehicle-availability-blocks.sql
-- Description: Creates vehicle_availability_blocks table with exclusion constraint to prevent double-bookings
-- Date: 2025-01-06
-- Ref: STRATEGIC_ROADMAP_2026.md - Part 2: Central Calendar & Booking System

-- ============================================================================
-- ENABLE REQUIRED EXTENSION
-- ============================================================================

-- btree_gist is required for exclusion constraints with mixed types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- VEHICLE AVAILABILITY BLOCKS TABLE
-- ============================================================================
-- This table enforces database-level double-booking prevention using PostgreSQL
-- exclusion constraints. No two bookings can overlap on the same vehicle.

CREATE TABLE IF NOT EXISTS vehicle_availability_blocks (
    id SERIAL PRIMARY KEY,

    -- Vehicle reference
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Time block
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    -- Block type: booking, maintenance, hold (temporary during checkout)
    block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('booking', 'maintenance', 'hold', 'reserved')),

    -- Optional references
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    brand_id INTEGER, -- Which brand created this block

    -- Hold management (for checkout flow)
    hold_expires_at TIMESTAMPTZ, -- When hold auto-releases
    held_by_session VARCHAR(100), -- Session ID that created the hold

    -- Notes
    notes TEXT,

    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: end_time must be after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),

    -- Constraint: hold blocks must have expiration
    CONSTRAINT hold_requires_expiry CHECK (
        block_type != 'hold' OR hold_expires_at IS NOT NULL
    )
);

-- ============================================================================
-- EXCLUSION CONSTRAINT (PREVENTS OVERLAPPING BLOCKS)
-- ============================================================================
-- This is the critical constraint that prevents double-bookings at the database level.
-- Uses GiST index with tsrange for efficient overlap detection.

ALTER TABLE vehicle_availability_blocks
ADD CONSTRAINT no_overlapping_blocks EXCLUDE USING gist (
    vehicle_id WITH =,
    block_date WITH =,
    tsrange(
        (block_date + start_time)::timestamp,
        (block_date + end_time)::timestamp
    ) WITH &&
) WHERE (block_type != 'hold' OR hold_expires_at > NOW());

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookups by vehicle and date
CREATE INDEX IF NOT EXISTS idx_availability_vehicle_date
ON vehicle_availability_blocks(vehicle_id, block_date);

-- Find all blocks for a specific booking
CREATE INDEX IF NOT EXISTS idx_availability_booking
ON vehicle_availability_blocks(booking_id) WHERE booking_id IS NOT NULL;

-- Find expired holds for cleanup
CREATE INDEX IF NOT EXISTS idx_availability_hold_expiry
ON vehicle_availability_blocks(hold_expires_at)
WHERE block_type = 'hold' AND hold_expires_at IS NOT NULL;

-- Find blocks by date range (for calendar views)
CREATE INDEX IF NOT EXISTS idx_availability_date_range
ON vehicle_availability_blocks(block_date, start_time, end_time);

-- Find blocks by type
CREATE INDEX IF NOT EXISTS idx_availability_type
ON vehicle_availability_blocks(block_type);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a time slot is available
CREATE OR REPLACE FUNCTION check_vehicle_availability(
    p_vehicle_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM vehicle_availability_blocks
        WHERE vehicle_id = p_vehicle_id
          AND block_date = p_date
          AND (block_type != 'hold' OR hold_expires_at > NOW())
          AND tsrange(
              (block_date + start_time)::timestamp,
              (block_date + end_time)::timestamp
          ) && tsrange(
              (p_date + p_start_time)::timestamp,
              (p_date + p_end_time)::timestamp
          )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to create a hold (for checkout flow)
CREATE OR REPLACE FUNCTION create_availability_hold(
    p_vehicle_id INTEGER,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_session_id VARCHAR(100),
    p_hold_minutes INTEGER DEFAULT 15
) RETURNS INTEGER AS $$
DECLARE
    v_block_id INTEGER;
BEGIN
    -- Try to insert hold block (will fail if overlap exists)
    INSERT INTO vehicle_availability_blocks (
        vehicle_id, block_date, start_time, end_time,
        block_type, hold_expires_at, held_by_session
    ) VALUES (
        p_vehicle_id, p_date, p_start_time, p_end_time,
        'hold', NOW() + (p_hold_minutes || ' minutes')::interval, p_session_id
    )
    RETURNING id INTO v_block_id;

    RETURN v_block_id;
EXCEPTION
    WHEN exclusion_violation THEN
        RETURN NULL; -- Slot not available
END;
$$ LANGUAGE plpgsql;

-- Function to convert hold to booking
CREATE OR REPLACE FUNCTION convert_hold_to_booking(
    p_block_id INTEGER,
    p_booking_id INTEGER,
    p_session_id VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    UPDATE vehicle_availability_blocks
    SET block_type = 'booking',
        booking_id = p_booking_id,
        hold_expires_at = NULL,
        held_by_session = NULL,
        updated_at = NOW()
    WHERE id = p_block_id
      AND block_type = 'hold'
      AND held_by_session = p_session_id
      AND hold_expires_at > NOW();

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to release expired holds
CREATE OR REPLACE FUNCTION cleanup_expired_holds() RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM vehicle_availability_blocks
    WHERE block_type = 'hold'
      AND hold_expires_at < NOW();

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_availability_updated_at
    BEFORE UPDATE ON vehicle_availability_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_availability_timestamp();

-- ============================================================================
-- RECORD MIGRATION
-- ============================================================================

INSERT INTO _migrations (id, migration_name, notes)
SELECT COALESCE(MAX(id), 0) + 1,
       '046-vehicle-availability-blocks',
       'Added vehicle_availability_blocks table with exclusion constraint for double-booking prevention'
FROM _migrations;
