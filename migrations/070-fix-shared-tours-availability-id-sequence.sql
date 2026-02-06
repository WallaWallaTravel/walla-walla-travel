-- Migration 070: Fix shared_tours_availability id sequence
-- Issue: The id column may not auto-generate if the sequence wasn't properly attached
-- when the table was created before the migration that defined it with SERIAL
-- This follows the same pattern as migrations 068 and 069

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS shared_tours_availability_id_seq;

-- Get the current max ID to set the sequence correctly (prevents duplicate key errors)
SELECT setval('shared_tours_availability_id_seq', COALESCE((SELECT MAX(id) FROM shared_tours_availability), 0) + 1, false);

-- Set the default on the id column to use the sequence
ALTER TABLE shared_tours_availability ALTER COLUMN id SET DEFAULT nextval('shared_tours_availability_id_seq');

-- Ensure the sequence is owned by the column (for proper cleanup if column/table is dropped)
ALTER SEQUENCE shared_tours_availability_id_seq OWNED BY shared_tours_availability.id;
