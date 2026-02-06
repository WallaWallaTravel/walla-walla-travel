-- Migration 068: Fix shared_tours id sequence
-- Issue: The id column doesn't auto-generate because the sequence wasn't properly attached
-- when the table was created before the migration that defined it with SERIAL

-- Ensure the sequence exists
CREATE SEQUENCE IF NOT EXISTS shared_tours_id_seq;

-- Get the current max ID to set the sequence correctly (prevents duplicate key errors)
SELECT setval('shared_tours_id_seq', COALESCE((SELECT MAX(id) FROM shared_tours), 0) + 1, false);

-- Set the default on the id column to use the sequence
ALTER TABLE shared_tours ALTER COLUMN id SET DEFAULT nextval('shared_tours_id_seq');

-- Ensure the sequence is owned by the column (for proper cleanup if column/table is dropped)
ALTER SEQUENCE shared_tours_id_seq OWNED BY shared_tours.id;
