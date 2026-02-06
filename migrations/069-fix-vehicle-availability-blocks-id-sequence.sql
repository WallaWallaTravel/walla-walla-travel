-- Migration 069: Fix vehicle_availability_blocks id sequence
-- Issue: The id column doesn't auto-generate because the sequence wasn't properly attached
-- when the table was created before the migration that defined it with SERIAL

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS vehicle_availability_blocks_id_seq;

-- Get the current max ID to set the sequence correctly (prevents duplicate key errors)
SELECT setval('vehicle_availability_blocks_id_seq', COALESCE((SELECT MAX(id) FROM vehicle_availability_blocks), 0) + 1, false);

-- Set the default on the id column to use the sequence
ALTER TABLE vehicle_availability_blocks ALTER COLUMN id SET DEFAULT nextval('vehicle_availability_blocks_id_seq');

-- Ensure the sequence is owned by the column (for proper cleanup if column/table is dropped)
ALTER SEQUENCE vehicle_availability_blocks_id_seq OWNED BY vehicle_availability_blocks.id;
